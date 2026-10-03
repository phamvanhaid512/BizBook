from datetime import timedelta
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error


class RevenueForecastAnalyzer:
    def forecast(self, rows, forecast_days=7):
        dataframe = self._prepare_dataframe(rows)

        if dataframe.empty:
            return {
                "model": None,
                "history": [],
                "forecast": [],
                "metrics": {},
                "trend": "unknown",
                "warning": "Không có dữ liệu doanh thu",
            }

        if len(dataframe) < 14:
            return self._moving_average_forecast(dataframe, forecast_days)

        feature_dataframe = self._build_features(dataframe)
        train_dataframe = feature_dataframe.dropna().copy()

        if len(train_dataframe) < 7:
            return self._moving_average_forecast(dataframe, forecast_days)

        feature_columns = [
            "day_of_week",
            "is_weekend",
            "lag_1",
            "lag_7",
            "rolling_mean_7",
        ]

        # Khởi tạo Random Forest Regressor
        model = RandomForestRegressor(
            n_estimators=100,
            max_depth=5,
            min_samples_split=4,
            random_state=42,
        )

        model.fit(
            train_dataframe[feature_columns],
            train_dataframe["revenue"],
        )

        metrics = self._calculate_metrics(train_dataframe, feature_columns)
        forecast_result = self._forecast_future(
            model, dataframe, feature_columns, forecast_days
        )

        return {
            "model": "random_forest",
            "history": self._serialize_history(dataframe),
            "forecast": forecast_result,
            "metrics": metrics,
            "trend": self._detect_trend(forecast_result),
            "warning": None,
        }

    def _prepare_dataframe(self, rows):
        if not rows:
            return pd.DataFrame(columns=["date", "revenue", "order_count"])

        dataframe = pd.DataFrame(rows)
        dataframe["date"] = pd.to_datetime(dataframe["date"]).dt.date

        dataframe["revenue"] = pd.to_numeric(
            dataframe["revenue"], errors="coerce"
        ).fillna(0)
        dataframe["order_count"] = pd.to_numeric(
            dataframe["order_count"], errors="coerce"
        ).fillna(0)

        # Gom nhóm theo ngày
        dataframe = (
            dataframe.groupby("date")
            .agg({"revenue": "sum", "order_count": "sum"})
            .reset_index()
        )
        dataframe["date"] = pd.to_datetime(dataframe["date"])
        dataframe = dataframe.sort_values("date")

        # Điền các ngày thiếu bằng 0 để đảm bảo chuỗi liên tục
        date_range = pd.date_range(
            start=dataframe["date"].min(),
            end=dataframe["date"].max(),
            freq="D",
        )

        dataframe = (
            dataframe.set_index("date")
            .reindex(date_range, fill_value=0)
            .rename_axis("date")
            .reset_index()
        )
        return dataframe

    def _build_features(self, dataframe):
        result = dataframe.copy()
        day_of_week = result["date"].dt.dayofweek

        result["day_of_week"] = day_of_week
        result["is_weekend"] = day_of_week.isin([4, 5, 6]).astype(int)

        result["lag_1"] = result["revenue"].shift(1)
        result["lag_7"] = result["revenue"].shift(7)
        result["rolling_mean_7"] = result["revenue"].shift(1).rolling(7).mean()
        return result

    def _calculate_metrics(self, train_dataframe, feature_columns):
        test_size = max(3, int(len(train_dataframe) * 0.15))
        if len(train_dataframe) - test_size < 3:
            return {"mae": None, "rmse": None}

        training_data = train_dataframe.iloc[:-test_size]
        testing_data = train_dataframe.iloc[-test_size:]

        eval_model = RandomForestRegressor(
            n_estimators=50, max_depth=5, random_state=42
        )
        eval_model.fit(training_data[feature_columns], training_data["revenue"])

        predictions = eval_model.predict(testing_data[feature_columns])
        actual_values = testing_data["revenue"].to_numpy()

        mae = mean_absolute_error(actual_values, predictions)
        rmse = np.sqrt(mean_squared_error(actual_values, predictions))

        return {
            "mae": round(float(mae), 0),
            "rmse": round(float(rmse), 0),
        }

    def _forecast_future(self, model, dataframe, feature_columns, forecast_days):
        working_dataframe = dataframe.copy()
        forecast_result = []

        # Giới hạn trần an toàn dựa trên lịch sử
        max_rev = working_dataframe["revenue"].max()
        upper_limit = float(max_rev * 1.25) if max_rev > 0 else 10_000_000.0

        for _ in range(forecast_days):
            next_date = working_dataframe["date"].max() + pd.Timedelta(days=1)
            new_row = pd.DataFrame([{
                "date": next_date,
                "revenue": 0,
                "order_count": 0,
            }])

            candidate_dataframe = pd.concat(
                [working_dataframe, new_row], ignore_index=True
            )
            feature_dataframe = self._build_features(candidate_dataframe)
            next_features = feature_dataframe.iloc[[-1]][feature_columns]

            predicted_val = float(model.predict(next_features)[0])
            clamped_val = float(np.clip(predicted_val, 0.0, upper_limit))

            forecast_result.append({
                "date": next_date.date().isoformat(),
                "predicted_revenue": round(clamped_val, 0),
            })

            candidate_dataframe.loc[candidate_dataframe.index[-1], "revenue"] = clamped_val
            working_dataframe = candidate_dataframe

        return forecast_result

    def _moving_average_forecast(self, dataframe, forecast_days):
        window_size = min(7, len(dataframe))
        average_revenue = float(dataframe["revenue"].tail(window_size).mean())
        last_date = dataframe["date"].max()

        forecast_result = []
        for index in range(1, forecast_days + 1):
            forecast_date = last_date + pd.Timedelta(days=index)
            forecast_result.append({
                "date": forecast_date.date().isoformat(),
                "predicted_revenue": round(average_revenue, 0),
            })

        return {
            "model": "moving_average",
            "history": self._serialize_history(dataframe),
            "forecast": forecast_result,
            "metrics": {"mae": None, "rmse": None},
            "trend": "stable",
            "warning": "Dữ liệu dưới 14 ngày nên dùng trung bình trượt",
        }

    def _serialize_history(self, dataframe):
        return [
            {
                "date": row["date"].date().isoformat(),
                "revenue": round(float(row["revenue"]), 0),
                "order_count": int(row["order_count"]),
            }
            for _, row in dataframe.iterrows()
        ]

    def _detect_trend(self, forecast_result):
        if len(forecast_result) < 2:
            return "stable"

        first_val = forecast_result[0]["predicted_revenue"]
        last_val = forecast_result[-1]["predicted_revenue"]

        if first_val <= 0:
            return "stable"

        change_percent = ((last_val - first_val) / first_val) * 100
        if change_percent > 3:
            return "increasing"
        if change_percent < -3:
            return "decreasing"
        return "stable"