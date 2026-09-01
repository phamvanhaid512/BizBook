from datetime import datetime


class ContextBuilder:
    def build_prompt_context(self, route_info: dict, analysis_data: dict) -> dict:
        return {
            "current_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "intent": route_info.get("intent"),
            "tool_executed": analysis_data.get("tool"),
            "raw_metrics": analysis_data.get("data"),
        }