from collections import defaultdict

import pandas as pd
from mlxtend.frequent_patterns import (
    apriori,
    association_rules,
)
from mlxtend.preprocessing import (
    TransactionEncoder,
)


class AprioriAnalyzer:
    def analyze(
        self,
        rows,
        min_support=0.02,
        min_confidence=0.3,
        min_lift=1.0,
        max_len=3,
        limit=20,
    ):
        transactions = self._build_transactions(
            rows
        )

        if len(transactions) < 2:
            return {
                "transaction_count": len(transactions),
                "product_count": 0,
                "frequent_itemsets": [],
                "rules": [],
                "warning": (
                    "Cần ít nhất 2 đơn hàng để chạy Apriori"
                ),
            }

        encoder = TransactionEncoder()

        encoded_array = (
            encoder
            .fit(transactions)
            .transform(transactions)
        )

        dataframe = pd.DataFrame(
            encoded_array,
            columns=encoder.columns_,
            dtype=bool,
        )

        itemsets_dataframe = apriori(
            dataframe,
            min_support=min_support,
            use_colnames=True,
            max_len=max_len,
        )

        if itemsets_dataframe.empty:
            return {
                "transaction_count": len(transactions),
                "product_count": len(
                    encoder.columns_
                ),
                "frequent_itemsets": [],
                "rules": [],
                "warning": (
                    "Không có tập sản phẩm đạt min_support"
                ),
            }

        rules_dataframe = association_rules(
            itemsets_dataframe,
            metric="confidence",
            min_threshold=min_confidence,
        )

        if not rules_dataframe.empty:
            rules_dataframe = (
                rules_dataframe[
                    rules_dataframe["lift"]
                    >= min_lift
                ]
                .sort_values(
                    by=[
                        "lift",
                        "confidence",
                        "support",
                    ],
                    ascending=False,
                )
            )

        frequent_itemsets = []

        for _, row in (
            itemsets_dataframe
            .sort_values(
                "support",
                ascending=False,
            )
            .head(limit)
            .iterrows()
        ):
            frequent_itemsets.append({
                "items": sorted(
                    list(row["itemsets"])
                ),
                "support": round(
                    float(row["support"]),
                    6,
                ),
            })

        rules = []

        for _, row in (
            rules_dataframe
            .head(limit)
            .iterrows()
        ):
            rules.append({
                "antecedents": sorted(
                    list(row["antecedents"])
                ),
                "consequents": sorted(
                    list(row["consequents"])
                ),
                "support": round(
                    float(row["support"]),
                    6,
                ),
                "confidence": round(
                    float(row["confidence"]),
                    6,
                ),
                "lift": round(
                    float(row["lift"]),
                    6,
                ),
            })

        return {
            "transaction_count": len(transactions),
            "product_count": len(
                encoder.columns_
            ),
            "frequent_itemsets": frequent_itemsets,
            "rules": rules,
            "warning": None,
        }

    def _build_transactions(self, rows):
        grouped_transactions = defaultdict(set)

        for row in rows:
            order_id = row.get("order_id")
            product_name = str(
                row.get("product_name") or ""
            ).strip()

            if not order_id or not product_name:
                continue

            grouped_transactions[
                order_id
            ].add(product_name)

        return [
            sorted(products)
            for products
            in grouped_transactions.values()
            if products
        ]