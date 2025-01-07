import os
import json
import logging
import re
from typing import Dict, Any, List
from dotenv import load_dotenv, find_dotenv
from langchain_groq import ChatGroq

class ImprovedMermaidGenerator:
    def __init__(self):
        self._initialize_environment()
        self._setup_model()
        self._setup_logging()

    def _initialize_environment(self):
        dotenv_path = find_dotenv()
        load_dotenv(dotenv_path)
        self.GROQ_API_KEY = os.getenv("GROQ_API_KEY")
        if not self.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY not found in environment variables")

    def _setup_model(self):
        self.model = ChatGroq(api_key=self.GROQ_API_KEY, model_name="llama-3.3-70b-specdec")

    def _setup_logging(self):
        logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

    def generate_diagram(self, user_input):
        logging.info("Starting Mermaid diagram generation process")
        diagram_type = self._determine_diagram_type(user_input)
        instructions = self._get_diagram_instructions(diagram_type)

        messages = [
            {"role": "system", "content": instructions},
            {"role": "user", "content": f"Create a complex and creative {diagram_type} for: {user_input}"}
        ]

        try:
            logging.debug("Sending request to Groq model")
            response = self.model.invoke(messages)
            logging.debug("Received response from Groq model")
            return self._process_response(response.content, diagram_type, user_input)
        except Exception as e:
            logging.error(f"Error in Mermaid diagram generation: {e}")
            return {'output': f'Error: {str(e)}', 'mermaid': None, 'suggestions': []}

    def _determine_diagram_type(self, user_input):
        determine_type_prompt = f"""Based on the following user input, determine the most appropriate Mermaid diagram type:
        User input: {user_input}
        
         Possible diagram types:
        1. flowchart
        2. sequenceDiagram
        3. classDiagram
        4. stateDiagram-v2
        5. erDiagram
        6. quadrantChart
        7. mindmap
        8. gantt
        
        Respond with ONLY the diagram type name, nothing else."""

        response = self.model.invoke([{"role": "user", "content": determine_type_prompt}])
        diagram_type = response.content.strip().lower()
        logging.info(f"Determined diagram type: {diagram_type}")
        return diagram_type

    def _get_diagram_instructions(self, diagram_type):
        base_instructions = """You are an expert in creating complex and professional Mermaid diagrams. Your task is to generate a detailed Mermaid diagram based on the user's request. Follow these guidelines:

    1. ALWAYS include explicit labels for ALL nodes and connections
    2. Never leave any node or connection without a label
    3. Use descriptive text for labels instead of placeholder text
    4. Ensure proper syntax and indentation
    5. Include comprehensive relationships and connections
    6. Use Mermaid syntax version 10.9.1
    7. Wrap the Mermaid code in triple backticks with 'mermaid' language specifier

        Example format of your response:
        ```mermaid
        [Complex diagram code here]
        ```
        [Detailed explanation of the diagram]

        Generate a complex and creative/professional Mermaid diagram code based on the user's request."""

        type_specific_instructions = {
            "flowchart": """For flowcharts:
            - Use a mix of node shapes (rectangles, diamonds, circles, etc.)
            - Include multiple decision points and parallel processes
            - Use subgraphs to group related processes
            - Add labels to edges for clarity
            - Consider including error handling or alternative paths
            
            Example syntax:
            ```mermaid
            flowchart TD
            A((Start)) --> B[Process]
            B --> C{Decision?}
            C -->|Yes| D[Do something]
            C -->|No| E[Do something else]
            subgraph SubProcess
                D --> F[End]
            end
            F --> G[Final End]
            ```
            """,
            
            "sequencediagram": """For sequence diagrams:
            - Include multiple participants (at least 4-5)
            - Use a variety of arrow types for different kinds of messages
            - Incorporate activations and deactivations
            - Include alternative paths and loops
            - Use notes for additional context or explanations
            - Consider adding parallel actions
            
            Example syntax:
            ```mermaid
            sequenceDiagram
            participant A as Alice
            participant B as Bob
            A->>B: Hello Bob
            B-->>A: Hi Alice
            A->>B: Are you OK?
            alt Is Bob OK?
                B->>A: Yes, I'm fine
            else Is Bob not OK?
                B-->>A: No, not really
            end
            note right of B: Bob seems tired
            ```
            """,
            
            "classdiagram": """For class diagrams:
            - Create a system with at least 5-6 interrelated classes
            - Use a mix of relationships (inheritance, composition, aggregation, etc.)
            - Include detailed attributes and methods for each class
            - Use interfaces or abstract classes where appropriate
            - Add multiplicities to relationships
            - Consider using namespaces or packages to group related classes
            
            Example syntax:
            ```mermaid
            classDiagram
            class Animal {
                +String name
                +int age
                +isMammal()
                +eat()
            }
            class Dog {
                +String breed
                +bark()
            }
            Animal <|-- Dog
            class Cat {
                +String color
                +meow()
            }
            Animal <|-- Cat
            ```
            """,
            
            "statediagram-v2": """For state diagrams:
            - Design a complex system with multiple states and sub-states
            - Include composite states with internal transitions
            - Use forks and joins for parallel states
            - Add detailed transition labels with events, conditions, and actions
            - Include entry and exit points
            - Consider adding history states or deep history states
            
            Example syntax:
            ```mermaid
            stateDiagram-v2
            [*] --> Idle
            Idle --> Working : Start button pressed
            state Working {
                [*] --> Processing
                Processing --> Finished
            }
            Finished --> Idle : Reset button pressed
            [*] --> Finished
            ```
            """,
            
            "erdiagram": """For entity-relationship diagrams:
            - Design a system with at least 6-7 entities
            - Use a mix of relationship types (one-to-one, one-to-many, many-to-many)
            - Include attributes for entities, marking key attributes
            - Use derived attributes or multi-valued attributes where appropriate
            - Consider adding weak entities and identifying relationships
            - Include relationship attributes where relevant
            
            Example syntax:
            ```mermaid
            erDiagram
            CUSTOMER ||--o{ ORDER : places
            ORDER ||--|{ LINE-ITEM : contains
            CUSTOMER {
                string name
                string address
            }
            ORDER {
                int id
                date orderDate
            }
            LINE-ITEM {
                int quantity
                double price
            }
            ```
            """,
             "quadrantchart": """For quadrant charts:
            - Define the title and axis labels (x-axis and y-axis)
            - Label each quadrant with a descriptive name
            - Plot multiple data points in the quadrants
            - Ensure each data point contains only two values: x and y coordinates.
            
            Example syntax:
            ```mermaid
            quadrantChart
                title Reach and engagement of campaigns
                x-axis Low Reach --> High Reach
                y-axis Low Engagement --> High Engagement
                quadrant-1 We should expand
                quadrant-2 Need to promote
                quadrant-3 Re-evaluate
                quadrant-4 May be improved
                Campaign A: [0.3, 0.6]
                Campaign B: [0.45, 0.23]
                Campaign C: [0.57, 0.69]
                Campaign D: [0.78, 0.34]
            ```
            """,

            "mindmap": """For mindmaps:
            - Start with a central concept and branch out with related ideas
            - Use different shapes for nodes (square, circle, cloud, etc.)
            - Incorporate icons and formatting (bold, italic) in the text
            - Use indentation to define the hierarchy
            
            Example syntax:
            ```mermaid
            mindmap
                root((mindmap))
                    Origins
                        Long history
                        ::icon(fa fa-book)
                        Popularisation
                            British popular psychology author Tony Buzan
                    Research
                        On effectiveness<br/>and features
                        On Automatic creation
                            Uses
                                Creative techniques
                                Strategic planning
                                Argument mapping
            ```
            """,

            "gantt": """For Gantt diagrams:
            - Define tasks with start dates, durations, and dependencies
            - Use sections to organize tasks
            - Add milestones and customize date formats
            - Support compact mode and exclude non-working days
            
            Example syntax:
            ```mermaid
            gantt
                title Project Timeline
                dateFormat  YYYY-MM-DD
                excludes    weekends
                section Planning
                Requirements Gathering    :done,    req1, 2024-01-06, 10d
                Design Specifications     :active,  des1, after req1, 7d
                section Implementation
                Development               :active,  dev1, after des1, 20d
                Testing                   :         test1, after dev1, 10d
                Integration               :         int1, after test1, 5d
                section Finalization
                Final Review              :         rev1, after int1, 3d
                Deployment                :         deploy1, after rev1, 2d
                section Milestones
                Project Kickoff           :milestone, kickoff, 2024-01-01, 0d
                Design Complete           :milestone, m1, after des1, 0d
                Development Complete      :milestone, m2, after dev1, 0d
                Testing Complete          :milestone, m3, after test1, 0d
                Project Complete          :milestone, m4, after deploy1, 0d
            ```
            """
        }

        return base_instructions + "\n\n" + type_specific_instructions.get(diagram_type, "")

    def _process_response(self, response_content, diagram_type, user_input):
        mermaid_diagram = self._extract_mermaid_code(response_content)
        
        if mermaid_diagram:
            corrected_diagram = self._correct_syntax(mermaid_diagram, diagram_type)
            result_output = "Mermaid diagram generated and syntax-corrected successfully."
            logging.info("Successfully extracted and corrected Mermaid diagram code")
        else:
            corrected_diagram = None
            result_output = "Failed to generate Mermaid diagram. Please try again."
            logging.warning("Failed to extract Mermaid diagram code")

        explanation = self._extract_explanation(response_content)
        suggestions = self.generate_suggested_prompts(user_input, diagram_type)
        
        return {
            'output': result_output,
            'mermaid': corrected_diagram,
            'explanation': explanation,
            'suggestions': suggestions
        }

    def _extract_mermaid_code(self, content):
        mermaid_match = re.search(r'```mermaid\n(.*?)\n```', content, re.DOTALL)
        if mermaid_match:
            return mermaid_match.group(1).strip()
        return None

    def _correct_syntax(self, diagram, diagram_type):
        if diagram_type == 'sequencediagram':
            # Correct common syntax errors in sequence diagrams
            diagram = re.sub(r'(participant\s+\w+)\s+as\s+(\w+)', r'\1 as \2', diagram)
            diagram = re.sub(r'(note\s+)(\w+)(\s+)(\w+)(:)', r'\1\2\3of \4\5', diagram)
        elif diagram_type == 'flowchart':
            # Ensure flowchart has a direction (default to TD if missing)
            if not re.search(r'flowchart\s+(TB|TD|BT|RL|LR)', diagram):
                diagram = 'flowchart TD\n' + diagram
        elif diagram_type == 'statediagram-v2':
            # Ensure state diagram uses v2 syntax
            diagram = diagram.replace('stateDiagram', 'stateDiagram-v2')
        elif diagram_type == 'quadrantchart':
             # Ensure proper formatting for quadrant charts
            diagram = re.sub(r'quadrantChart', 'quadrantChart\n', diagram)
            diagram = re.sub(r'(quadrant-\d)', r'\n\1', diagram)
            diagram = re.sub(r'(x-axis\s[^\n]+)', r'\n\1', diagram) 
            diagram = re.sub(r'(y-axis\s[^\n]+)', r'\n\1', diagram) 
            diagram = re.sub(r'(title\s[^\n]+)', r'\n\1', diagram) 
            diagram = re.sub(r'\[([^\]]+?)\]', lambda m: f"[{', '.join(m.group(1).split(',')[:2])}]", diagram)
        elif diagram_type == 'mindmap':
            # Ensure correct indentation and syntax for mindmaps
            diagram = re.sub(r'\s+', ' ', diagram) 
            diagram = re.sub(r'mindmap', 'mindmap\n', diagram)
            diagram = re.sub(r'(\w+\(\([^)]*\)\))', r'\1\n', diagram) 
            diagram = re.sub(r'(\*\*[^*]+\*\*)', r'\1\n', diagram)
        elif diagram_type == 'gantt':
            diagram = re.sub(r'gantt\s*', 'gantt\n', diagram)
            
            # Add more syntax corrections for other diagram types as needed
        
        return diagram

    def _extract_explanation(self, content):
        explanation_match = re.search(r'```mermaid.*?```\s*(.*)', content, re.DOTALL)
        if explanation_match:
            return explanation_match.group(1).strip()
        return "No explanation provided."

    def generate_suggested_prompts(self, user_input, diagram_type):
        logging.info(f"Generating suggested prompts for diagram type: {diagram_type}")
        prompt = f"""Based on the following user input for a {diagram_type}, suggest 3 complex and creative follow-up questions or diagram modifications. Focus on enhancing the diagram's complexity, adding unique features, or exploring advanced aspects of the system being modeled.

        User input: {user_input}

        IMPORTANT: Provide ONLY the questions or suggestions, one per line. Do not include any explanations, numbering, or additional text.

        Suggested questions or modifications:"""

        try:
            logging.debug("Sending request to Groq model for suggestions")
            response = self.model.invoke([
                {"role": "system", "content": "You are a creative Mermaid diagram expert."},
                {"role": "user", "content": prompt}
            ])
            suggestions = response.content.split('\n')
            suggestions = [s.strip() for s in suggestions if s.strip().endswith('?') or s.strip().startswith('Add') or s.strip().startswith('Incorporate')]
            logging.info(f"Generated suggestions: {suggestions[:3]}")
            return suggestions[:3]
        except Exception as e:
            logging.error(f"Error generating suggestions: {e}")
            return ["Error generating suggestions. Please try again."]

def main():
    generator = ImprovedMermaidGenerator()
    print("Welcome to the Improved Mermaid Diagram Generator!")
    print("This tool supports complex flowcharts, sequence diagrams, class diagrams, state diagrams, ER diagrams, quadrant charts, mindmaps, and Gantt diagrams.")
    print("Type 'quit' to exit the program.")
    
    while True:
        user_input = input("\nEnter your diagram request: ")
        if user_input.lower() == 'quit':
            print("Thank you for using the Improved Mermaid Diagram Generator. Goodbye!")
            break
        
        result = generator.generate_diagram(user_input)
        
        print("\nGenerated Diagram:")
        if result['mermaid']:
            print("```mermaid")
            print(result['mermaid'])
            print("```")
            print("\nExplanation:")
            print(result['explanation'])
        else:
            print(result['output'])
        
        print("\nSuggestions for further exploration:")
        for i, suggestion in enumerate(result['suggestions'], 1):
            print(f"{i}. {suggestion}")

if __name__ == '__main__':
    main()
