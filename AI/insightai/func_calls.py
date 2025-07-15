# func_calls.py
task_eval_function = [
    {
        "name": "QA_Response",
        "description": "The answer classification function",
        "parameters": {
            "type": "object",
            "properties": {
                "answer": {
                    "type": "string",
                    "description": "Answer as a narrative, or as an algorithm",
                },
                "answer_type": {
                    "type": "string",
                    "enum": ["narrative", "algorithm"],
                    "description": "Task classification",
                },
            },
            "required": ["answer", "answer_type"],
        },
    },
]

solution_insights_function = [
    {
        "name": "Solution_Insights",
        "description": "The solution summary and insights function",
        "parameters": {
            "type": "object",
            "properties": {
                "insight": {
                    "type": "string",
                    "description": "Delivers a comprehensive summary of the outcomes obtained from the execution of the python code",
                },
            },
            "required": ["insight"],
        },
    },
]

mapper_description_schema = {
            "type": "object",
            "properties": {
                "descriptions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "column_name": {
                                "type": "string",
                                "description": "The name of the column"
                            },
                            "description": {
                                "type": "string",
                                "description": "A concise explanation of what the column represents"
                            }
                        },
                        "required": ["column_name", "description"]
                    }
                }
            },
            "required": ["descriptions"]
        }

matcher_schema = {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The original user query."
                },
                "matches": {
                    "type": "array",
                    "description": "List of target fields with matched dataset column names.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "target_field": {
                                "type": "string",
                                "description": "The inferred field user is asking for."
                            },
                            "matched_column": {
                                "type": "string",
                                "description": "Best matching column from the actual dataset."
                            }
                        },
                        "required": ["target_field", "matched_column"]
                    }
                }
            },
            "required": ["query", "matches"]
        }