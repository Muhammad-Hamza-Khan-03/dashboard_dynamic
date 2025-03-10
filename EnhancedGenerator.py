import numpy as np
import pandas as pd
import logging
from typing import Dict, Any, List, Tuple, Optional
from pyecharts import options as opts
from pyecharts.charts import (
    Line, Bar, Pie, Scatter, Boxplot, EffectScatter,
    Funnel, Gauge, HeatMap, Kline, Radar, TreeMap, Surface3D,
    Bar3D, Line3D, Scatter3D, Map, Graph, Liquid, Parallel,
    Sankey, Sunburst
)
from pyecharts.commons.utils import JsCode


class EnhancedChartGenerator:
    @staticmethod
    def _initialize_chart(chart_type: str):
        """Initialize the appropriate chart type with proper error handling."""
        chart_types = {
            'line': Line,
            'bar': Bar,
            'pie': Pie,
            'scatter': Scatter,
            'box': Boxplot,
            'histogram': Bar,
            'segmented-bar': Bar,
            'effect-scatter': EffectScatter,
            'funnel': Funnel,
            'gauge': Gauge,
            'heatmap': HeatMap,
            'kline': Kline,
            'radar': Radar,
            'treemap': TreeMap,
            'surface3d': Surface3D,
            'bar3d': Bar3D,
            'line3d': Line3D,
            'scatter3d': Scatter3D,
            'map': Map,
            'graph': Graph,
            'liquid': Liquid,
            'parallel': Parallel,
            'sankey': Sankey,
            'sunburst': Sunburst,
        }
        
        if chart_type not in chart_types:
            raise ValueError(f'Unsupported chart type: {chart_type}')
            
        ChartClass = chart_types[chart_type]
        return ChartClass()


    @staticmethod
    def create_chart(
        chart_type: str,
        df: pd.DataFrame,
        selected_columns: list,
        options: Optional[Dict[str, Any]] = None
    ) -> Tuple[Any, str]:
        """Creates a responsive chart with the specified type and data."""
        try:
            chart = EnhancedChartGenerator._initialize_chart(chart_type)
            options = options or {}
            
            # Create title for the chart
            if len(selected_columns) > 1:
                title = f"{selected_columns[0]} vs {', '.join(selected_columns[1:])}"
            elif len(selected_columns) == 1:
                title = f"{selected_columns[0]} Analysis"
            else:
                title = f"{chart_type.capitalize()} Chart"
                
            # Process data based on chart type
            if chart_type == 'scatter':
                return EnhancedChartGenerator._create_scatter(df, selected_columns, options, title)
            elif chart_type == 'effect-scatter':
                return EnhancedChartGenerator._create_effect_scatter(df, selected_columns, options, title)
            elif chart_type == 'funnel':
                return EnhancedChartGenerator._create_funnel(df, selected_columns, options, title)
            elif chart_type == 'gauge':
                return EnhancedChartGenerator._create_gauge(df, selected_columns, options, title)
            elif chart_type == 'heatmap':
                return EnhancedChartGenerator._create_heatmap(df, selected_columns, options, title)
            elif chart_type == 'kline':
                return EnhancedChartGenerator._create_kline(df, selected_columns, options, title)
            elif chart_type == 'radar':
                return EnhancedChartGenerator._create_radar(df, selected_columns, options, title)
            elif chart_type == 'treemap':
                return EnhancedChartGenerator._create_treemap(df, selected_columns, options, title)
            elif chart_type == 'surface3d':
                return EnhancedChartGenerator._create_surface3d(df, selected_columns, options, title)
            elif chart_type in ['bar3d', 'line3d', 'scatter3d']:
                return EnhancedChartGenerator._create_3d_chart(chart_type, df, selected_columns, options, title)
            elif chart_type == 'map':
                return EnhancedChartGenerator._create_map(df, selected_columns, options, title)
            elif chart_type == 'graph':
                return EnhancedChartGenerator._create_graph(df, selected_columns, options, title)
            elif chart_type == 'liquid':
                return EnhancedChartGenerator._create_liquid(df, selected_columns, options, title)
            elif chart_type == 'parallel':
                return EnhancedChartGenerator._create_parallel(df, selected_columns, options, title)
            elif chart_type == 'sankey':
                return EnhancedChartGenerator._create_sankey(df, selected_columns, options, title)
            elif chart_type == 'sunburst':
                return EnhancedChartGenerator._create_sunburst(df, selected_columns, options, title)
            
            # Handle basic chart types
            if chart_type in ['line', 'bar', 'segmented-bar']:
                x_data = df[selected_columns[0]].tolist()
                chart.add_xaxis(x_data)
                for col in selected_columns[1:]:
                    y_data = df[col].tolist()
                    chart.add_yaxis(
                        col,
                        y_data,
                        label_opts=opts.LabelOpts(is_show=False),
                        stack="total" if chart_type == 'segmented-bar' else None
                    )
            elif chart_type == 'histogram':
                values = df[selected_columns[0]].dropna()
                bin_count = options.get('binSize', 10)
                hist, bins = np.histogram(values, bins=bin_count)
                bin_labels = [f"{bins[i]:.2f}-{bins[i+1]:.2f}" for i in range(len(bins)-1)]
                
                chart.add_xaxis(bin_labels)
                chart.add_yaxis(
                    "Frequency",
                    hist.tolist(),
                    label_opts=opts.LabelOpts(is_show=False)
                )
                
            elif chart_type == 'pie':
                data_pairs = [
                    (str(row[selected_columns[0]]), float(row[selected_columns[1]]))
                    for _, row in df.iterrows()
                ]
                chart.add(
                    series_name="",
                    data_pair=data_pairs,
                    label_opts=opts.LabelOpts(
                        formatter="{b}: {c}",
                        position="outside"
                    )
                )
                
            elif chart_type == 'box':
                data = [df[col].dropna().tolist() for col in selected_columns]
                chart.add_xaxis(selected_columns)
                chart.add_yaxis("Boxplot", chart.prepare_data(data))

            # Configure common options for charts
            EnhancedChartGenerator._configure_common_options(chart, title, options)

            # Set chart to be responsive
            chart.width = "100%"
            chart.height = "100%"
            chart.renderer = "canvas"  # Canvas renderer is more efficient

            return chart, title

        except Exception as e:
            logging.error(f"Error creating chart: {str(e)}")
            raise

    @staticmethod
    def _create_scatter(df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any], title: str) -> Tuple[Any, str]:
        """Creates a scatter plot."""
        if len(selected_columns) < 2:
            raise ValueError("Scatter plot requires at least 2 columns")
        
        # Create scatter chart
        chart = Scatter()
        
        # Convert to numeric values with error handling
        x_values = []
        y_values = []
        
        for _, row in df.iterrows():
            try:
                x = float(row[selected_columns[0]])
                y = float(row[selected_columns[1]])
                if not (pd.isna(x) or pd.isna(y)):
                    x_values.append(x)
                    y_values.append(y)
            except (ValueError, TypeError) as e:
                logging.warning(f"Skipping scatter point due to conversion error: {e}")
                continue
                
        # If we have no valid points, create some dummy data
        if not x_values:
            x_values = [0, 1, 2, 3, 4]
            y_values = [0, 1, 4, 9, 16]
            
        # Add data to chart
        chart.add_xaxis(x_values)
        chart.add_yaxis(
            series_name=selected_columns[1],
            y_axis=y_values,
            symbol_size=options.get('symbol_size', 15),
            label_opts=opts.LabelOpts(is_show=False),
            itemstyle_opts=opts.ItemStyleOpts(
                color=options.get('color', '#5470c6'),
                opacity=0.8,
                border_width=0.5,
                border_color="#fff"
            )
        )
        
        # Configure x and y axis
        chart.set_global_opts(
            xaxis_opts=opts.AxisOpts(
                name=selected_columns[0],
                name_location="center",
                name_gap=30,
                type_="value",
                splitline_opts=opts.SplitLineOpts(is_show=True)
            ),
            yaxis_opts=opts.AxisOpts(
                name=selected_columns[1],
                name_location="center",
                name_gap=40,
                type_="value",
                splitline_opts=opts.SplitLineOpts(is_show=True)
            ),
            # Add brush for selecting points
            brush_opts=opts.BrushOpts(
                tool_box=["rect", "polygon", "keep", "clear"],
                brush_type="rect"
            )
        )
        
        # Configure common options
        EnhancedChartGenerator._configure_common_options(chart, title, options)
        
        return chart, title
    
    @staticmethod
    def _create_effect_scatter(df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any], title: str) -> Tuple[Any, str]:
        """Creates an effect scatter plot with animated effects."""
        if len(selected_columns) < 2:
            raise ValueError("Effect scatter plot requires at least 2 columns")
        
        # Option to use a simpler implementation for better compatibility
        use_custom_effect = options.get('use_custom_effect', True)
        
        if use_custom_effect:
            try:
                # Just use regular scatter chart with custom styling
                chart = Scatter()
                
                # Convert to numeric values with error handling
                x_values = []
                y_values = []
                
                for _, row in df.iterrows():
                    try:
                        x = float(row[selected_columns[0]])
                        y = float(row[selected_columns[1]])
                        if not (pd.isna(x) or pd.isna(y)):
                            x_values.append(x)
                            y_values.append(y)
                    except (ValueError, TypeError) as e:
                        logging.warning(f"Skipping scatter point due to conversion error: {e}")
                        continue
                
                # If we have no valid points, create some dummy data
                if not x_values:
                    x_values = [0, 1, 2, 3, 4]
                    y_values = [0, 1, 4, 9, 16]
                
                chart.add_xaxis(x_values)
                chart.add_yaxis(
                    series_name=selected_columns[1],
                    y_axis=y_values,
                    symbol="circle",
                    symbol_size=options.get('symbol_size', 15),
                    label_opts=opts.LabelOpts(is_show=False),
                    itemstyle_opts=opts.ItemStyleOpts(
                        color=options.get('color', '#5470c6'),
                        opacity=0.8,
                        border_width=0,
                        border_color="#fff"
                    )
                )
                
                # Add a second layer for the effect
                chart.add_yaxis(
                    series_name="effect",
                    y_axis=y_values,
                    symbol="circle",
                    symbol_size=25,
                    label_opts=opts.LabelOpts(is_show=False),
                    itemstyle_opts=opts.ItemStyleOpts(
                        color=options.get('color', '#5470c6'),
                        opacity=0.3,
                        border_width=0,
                        border_color="#fff"
                    )
                )
                
                # Configure x and y axis
                chart.set_global_opts(
                    xaxis_opts=opts.AxisOpts(
                        name=selected_columns[0],
                        name_location="center",
                        name_gap=30,
                        type_="value",
                        splitline_opts=opts.SplitLineOpts(is_show=True)
                    ),
                    yaxis_opts=opts.AxisOpts(
                        name=selected_columns[1],
                        name_location="center",
                        name_gap=40,
                        type_="value",
                        splitline_opts=opts.SplitLineOpts(is_show=True)
                    )
                )
                
                # Configure common options
                EnhancedChartGenerator._configure_common_options(chart, title, options)
                
                return chart, title
                
            except Exception as e:
                logging.error(f"Error creating custom effect scatter: {str(e)}")
                logging.warning("Falling back to pyecharts effect scatter")
        
        # Use pyecharts if custom option is disabled or failed
        chart = EffectScatter()
        
        # Convert to numeric values with error handling
        x_values = []
        y_values = []
        
        for _, row in df.iterrows():
            try:
                x = float(row[selected_columns[0]])
                y = float(row[selected_columns[1]])
                if not (pd.isna(x) or pd.isna(y)):
                    x_values.append(x)
                    y_values.append(y)
            except (ValueError, TypeError) as e:
                logging.warning(f"Skipping scatter point due to conversion error: {e}")
                continue
                
        # If we have no valid points, create some dummy data
        if not x_values:
            x_values = [0, 1, 2, 3, 4]
            y_values = [0, 1, 4, 9, 16]
        
        chart.add_xaxis(x_values)
        chart.add_yaxis(
            series_name=selected_columns[1],
            y_axis=y_values,
            symbol_size=options.get('symbol_size', 15),
            effect_opts=opts.EffectOpts(
                brush_type="stroke",
                scale=options.get('effect_scale', 2.5),
                period=4
            ),
            itemstyle_opts=opts.ItemStyleOpts(
                color=options.get('color', '#5470c6'),
                opacity=0.8
            )
        )
        
        # Configure x and y axis
        chart.set_global_opts(
            xaxis_opts=opts.AxisOpts(
                name=selected_columns[0],
                name_location="center",
                name_gap=30,
                type_="value",
                splitline_opts=opts.SplitLineOpts(is_show=True)
            ),
            yaxis_opts=opts.AxisOpts(
                name=selected_columns[1],
                name_location="center",
                name_gap=40,
                type_="value",
                splitline_opts=opts.SplitLineOpts(is_show=True)
            )
        )
        
        # Configure options
        EnhancedChartGenerator._configure_common_options(chart, title, options)
        
        return chart, title

    @staticmethod
    def _create_funnel(df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any], title: str) -> Tuple[Any, str]:
        """Creates a funnel chart showing stages in a process."""
        if len(selected_columns) < 2:
            raise ValueError("Funnel chart requires at least 2 columns")
            
        chart = Funnel()
        
        # Prepare data pairs (category, value)
        data_pairs = []
        for _, row in df.iterrows():
            try:
                category = str(row[selected_columns[0]])
                value = float(row[selected_columns[1]])
                data_pairs.append((category, value))
            except (ValueError, TypeError) as e:
                logging.warning(f"Skipping row due to conversion error: {e}")
                continue
        
        # Sort data by value in descending order
        data_pairs.sort(key=lambda x: x[1], reverse=True)
        
        # Add funnel series
        chart.add(
            series_name=selected_columns[1],
            data_pair=data_pairs,
            gap=options.get('gap', 2),
            label_opts=opts.LabelOpts(
                position="inside",
                formatter="{b}: {c}"
            ),
            itemstyle_opts=opts.ItemStyleOpts(opacity=0.8)
        )

        # Configure options
        EnhancedChartGenerator._configure_common_options(chart, title, options)
        
        return chart, title

    @staticmethod
    def _create_gauge(df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any], title: str) -> Tuple[Any, str]:
        """Creates a gauge chart showing a single value within a range."""
        if len(selected_columns) < 1:
            raise ValueError("Gauge chart requires at least 1 column")
            
        chart = Gauge()

        # Get the first value from selected column
        try:
            value = float(df[selected_columns[0]].iloc[0])
        except (ValueError, IndexError):
            value = 0

        # Calculate min and max values
        min_val = options.get('min', 0)
        max_val = options.get('max', 100)

        # Add gauge series
        chart.add(
            series_name=selected_columns[0],
            data_pair=[("", value)],
            min_=min_val,
            max_=max_val,
            split_number=options.get('split_number', 10),
            axisline_opts=opts.AxisLineOpts(
                linestyle_opts=opts.LineStyleOpts(
                    color=[[0.3, "#67e0e3"], [0.7, "#37a2da"], [1, "#fd666d"]], 
                    width=30
                )
            )
        )

        # Configure options
        EnhancedChartGenerator._configure_common_options(chart, title, options)
        
        return chart, title

    @staticmethod
    def _create_heatmap(df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any], title: str) -> Tuple[Any, str]:
        """Creates a heatmap visualization."""
        if len(selected_columns) < 3:
            raise ValueError("Heatmap requires at least 3 columns")
            
        chart = HeatMap()

        # Prepare data
        x_axis = sorted(df[selected_columns[0]].unique().tolist())
        y_axis = sorted(df[selected_columns[1]].unique().tolist())

        # Create heatmap data matrix
        data = []
        for i, x in enumerate(x_axis):
            for j, y in enumerate(y_axis):
                filtered_df = df[(df[selected_columns[0]] == x) & (df[selected_columns[1]] == y)]
                if not filtered_df.empty:
                    value = filtered_df[selected_columns[2]].mean()
                    if not pd.isna(value):
                        data.append([i, j, float(value)])

        # Add axes
        chart.add_xaxis(x_axis)
        chart.add_yaxis(
            series_name="",
            yaxis_data=y_axis,
            value=data,
            label_opts=opts.LabelOpts(is_show=True, formatter="{c}"),
        )

        # Add visual mapping
        if data:
            chart.set_global_opts(
                visualmap_opts=opts.VisualMapOpts(
                    min_=min(d[2] for d in data) if data else 0,
                    max_=max(d[2] for d in data) if data else 100,
                    is_calculable=True,
                    orient="horizontal",
                    pos_left="center"
                )
            )

        # Configure options
        EnhancedChartGenerator._configure_common_options(chart, title, options)
        
        return chart, title

    @staticmethod
    def _create_kline(df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any], title: str) -> Tuple[Any, str]:
        """Creates a K-line (candlestick) chart for financial data."""
        if len(selected_columns) < 5:
            raise ValueError("K-line chart requires 5 columns: date, open, close, low, high")
            
        chart = Kline()
    
        # Prepare K-line data with error handling
        kline_data = []
        for _, row in df.iterrows():
            try:
                kline_point = [
                    float(row[selected_columns[1]]),  # open
                    float(row[selected_columns[2]]),  # close
                    float(row[selected_columns[3]]),  # low
                    float(row[selected_columns[4]])   # high
                ]
                kline_data.append(kline_point)
            except (ValueError, TypeError) as e:
                logging.warning(f"Skipping row due to conversion error: {e}")
                continue

        # Add X axis (dates)
        date_data = df[selected_columns[0]].tolist()
        chart.add_xaxis(date_data[:len(kline_data)])  # Ensure lengths match

        # Add K-line series
        chart.add_yaxis(
            series_name="Price",
            y_axis=kline_data,
            itemstyle_opts=opts.ItemStyleOpts(
                color="#ef232a",
                color0="#14b143",
                border_color="#ef232a",
                border_color0="#14b143",
            ),
            markpoint_opts=opts.MarkPointOpts(
                data=[
                    opts.MarkPointItem(type_="max", name="Maximum"),
                    opts.MarkPointItem(type_="min", name="Minimum")
                ]
            )
        )

        # Configure additional K-line specific options
        chart.set_global_opts(
            xaxis_opts=opts.AxisOpts(
                type_="category",
                is_scale=True
            ),
            yaxis_opts=opts.AxisOpts(
                is_scale=True,
                splitarea_opts=opts.SplitAreaOpts(is_show=True)
            )
        )

        # Configure common options
        EnhancedChartGenerator._configure_common_options(chart, title, options)
        
        return chart, title

    @staticmethod
    def _create_radar(df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any], title: str) -> Tuple[Any, str]:
        """Creates a radar chart for multi-dimensional data analysis."""
        if len(selected_columns) < 2:
            raise ValueError("Radar chart requires at least 2 columns")
            
        chart = Radar()

        # Prepare indicator schema
        indicators = []
        for col in selected_columns[1:]:
            max_val = df[col].max() * 1.1  # Add 10% padding
            if pd.isna(max_val) or max_val <= 0:
                max_val = 100  # Default max if invalid
            indicators.append(opts.RadarIndicatorItem(name=col, max_=float(max_val)))

        # Prepare data for each category
        categories = df[selected_columns[0]].unique()
        data = []
        for category in categories:
            category_data = df[df[selected_columns[0]] == category]
            if not category_data.empty:
                values = []
                for col in selected_columns[1:]:
                    val = float(category_data[col].iloc[0]) if not category_data[col].empty else 0
                    values.append(val)
                data.append({
                    "value": values,
                    "name": str(category)
                })

        # Add radar schema
        chart.add_schema(
            schema=indicators,
            shape=options.get('shape', 'circle'),
            center=['50%', '50%'],
            radius='70%'
        )

        # Add data series
        chart.add(
            series_name="",
            data=data,
            areastyle_opts=opts.AreaStyleOpts(opacity=0.3),
            linestyle_opts=opts.LineStyleOpts(width=2)
        )

        # Configure options
        EnhancedChartGenerator._configure_common_options(chart, title, options)
        
        return chart, title

    @staticmethod
    def _create_treemap(df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any], title: str) -> Tuple[Any, str]:
        """Creates a treemap visualization."""
        if len(selected_columns) < 1:
            raise ValueError("Treemap requires at least 1 column")
            
        chart = TreeMap()

        # Prepare hierarchical data
        def build_tree(data, columns, level=0):
            if level >= len(columns) or data.empty:
                return []

            try:
                grouped = data.groupby(columns[level])
            except KeyError:
                return []  # Column doesn't exist
                
            result = []

            for name, group in grouped:
                node = {
                    "name": str(name),
                    "value": len(group) if level == len(columns) - 1 else None
                }

                if level < len(columns) - 1:
                    children = build_tree(group, columns, level + 1)
                    if children:
                        node["children"] = children

                result.append(node)

            return result

        # Build tree data
        tree_data = build_tree(df, selected_columns)
        
        # If tree_data is empty, create a placeholder
        if not tree_data:
            tree_data = [{"name": "No Data", "value": 0}]

        # Add treemap series
        chart.add(
            series_name="",
            data=tree_data,
            leaf_depth=options.get('leaf_depth', 2),
            label_opts=opts.LabelOpts(
                position="inside",
                formatter="{b}: {c}"
            ),
            # upperLabel_opts=opts.LabelOpts(is_show=True)  # This might cause issues
        )

        # Configure options
        EnhancedChartGenerator._configure_common_options(chart, title, options)
        
        return chart, title

    @staticmethod
    def _create_surface3d(df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any], title: str) -> Tuple[Any, str]:
        """Creates a 3D surface chart."""
        if len(selected_columns) < 3:
            raise ValueError("3D Surface chart requires 3 columns: x, y, z")
            
        chart = Surface3D()
        
        # Create 3D surface data from three columns
        x_data = df[selected_columns[0]].unique()
        y_data = df[selected_columns[1]].unique()
        
        # Ensure we have numeric x and y values
        try:
            x_data = [float(x) for x in x_data]
            y_data = [float(y) for y in y_data]
        except (ValueError, TypeError):
            # If conversion fails, use numeric indices
            x_data = list(range(len(x_data)))
            y_data = list(range(len(y_data)))
        
        data = []
        for x in x_data:
            for y in y_data:
                filtered_df = df[
                    (df[selected_columns[0]] == x) & 
                    (df[selected_columns[1]] == y)
                ]
                if not filtered_df.empty:
                    try:
                        z = float(filtered_df[selected_columns[2]].iloc[0])
                        data.append([x, y, z])
                    except (ValueError, TypeError, IndexError):
                        # Skip invalid points
                        pass
        
        chart.add(
            series_name="",
            data=data,
            shading="realistic",
            itemstyle_opts=opts.ItemStyleOpts(opacity=0.8)
        )
        
        # Configure options
        EnhancedChartGenerator._configure_common_options(chart, title, options)
        
        return chart, title

    @staticmethod
    def _create_3d_chart(chart_type: str, df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any], title: str) -> Tuple[Any, str]:
        """Creates various types of 3D charts (bar, line, scatter) with fallback to matplotlib for compatibility."""
        if len(selected_columns) < 3:
            raise ValueError(f"{chart_type} requires 3 columns: x, y, z")
        
        # Option to use matplotlib instead of pyecharts for 3D charts
        use_matplotlib = options.get('use_matplotlib', True)
        
        if use_matplotlib:
            try:
                import matplotlib
                matplotlib.use('Agg')  # Non-interactive backend
                import matplotlib.pyplot as plt
                from io import BytesIO
                import base64
                from pyecharts.charts import Page
                from pyecharts.components import Html
                import numpy as np
                
                # Create a figure with matplotlib
                fig = plt.figure(figsize=(10, 8), dpi=100)
                ax = fig.add_subplot(111, projection='3d')
                
                # Extract data
                x_data = df[selected_columns[0]].astype(float).tolist()
                y_data = df[selected_columns[1]].astype(float).tolist()
                z_data = df[selected_columns[2]].astype(float).tolist()
                
                # Plot according to chart type
                if chart_type == 'scatter3d':
                    ax.scatter(x_data, y_data, z_data, c=z_data, cmap='viridis', 
                              marker='o', s=50, alpha=0.6)
                elif chart_type == 'bar3d':
                    # For bar3d, we need to discretize the space
                    unique_x = sorted(set(x_data))
                    unique_y = sorted(set(y_data))
                    
                    # Create grid
                    x_pos = range(len(unique_x))
                    y_pos = range(len(unique_y))
                    
                    # Create mapping from values to indices
                    x_map = {val: idx for idx, val in enumerate(unique_x)}
                    y_map = {val: idx for idx, val in enumerate(unique_y)}
                    
                    # Create 2D grid for z values
                    z_grid = np.zeros((len(unique_y), len(unique_x)))
                    
                    # Fill z grid with data
                    for i in range(len(x_data)):
                        x_idx = x_map[x_data[i]]
                        y_idx = y_map[y_data[i]]
                        z_grid[y_idx, x_idx] = z_data[i]
                    
                    # Create meshgrid
                    x_mg, y_mg = np.meshgrid(x_pos, y_pos)
                    
                    # Plot as bar3d
                    dx = dy = 0.8
                    ax.bar3d(x_mg.flatten(), y_mg.flatten(), np.zeros_like(z_grid).flatten(),
                            dx, dy, z_grid.flatten(), shade=True, color='skyblue', alpha=0.8)
                    
                    # Set tick labels
                    ax.set_xticks(x_pos)
                    ax.set_yticks(y_pos)
                    ax.set_xticklabels(unique_x)
                    ax.set_yticklabels(unique_y)
                    
                elif chart_type == 'line3d':
                    # Sort data for line
                    points = sorted(zip(x_data, y_data, z_data), key=lambda p: (p[0], p[1]))
                    x_data = [p[0] for p in points]
                    y_data = [p[1] for p in points]
                    z_data = [p[2] for p in points]
                    
                    ax.plot(x_data, y_data, z_data, 'r-', linewidth=2, alpha=0.8)
                    ax.scatter(x_data, y_data, z_data, c='blue', marker='o', s=30, alpha=0.6)
                
                # Set labels and title
                ax.set_xlabel(selected_columns[0])
                ax.set_ylabel(selected_columns[1])
                ax.set_zlabel(selected_columns[2])
                ax.set_title(title)
                
                # Add grid
                ax.grid(True)
                
                # Adjust view angle
                ax.view_init(elev=30, azim=45)
                
                # Save to BytesIO
                buffer = BytesIO()
                plt.tight_layout()
                plt.savefig(buffer, format='png', dpi=100)
                buffer.seek(0)
                
                # Encode as base64
                img_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
                
                # Create a Page with HTML component containing the image
                page = Page()
                html_img = f"""
                <div style="width:100%;height:100%;display:flex;justify-content:center;align-items:center;">
                    <div style="width:100%;max-width:800px;">
                        <img src="data:image/png;base64,{img_data}" style="width:100%;"/>
                    </div>
                </div>
                """
                html_component = Html(html_img)
                page.add(html_component)
                
                # Set page properties to make it display correctly
                page.width = "100%"
                page.height = "100%"
                
                plt.close(fig)  # Clean up
                return page, title
                
            except Exception as e:
                logging.error(f"Error creating matplotlib 3D chart: {str(e)}")
                logging.warning("Falling back to pyecharts 3D chart")
                # Fall back to pyecharts
        
        # Use pyecharts if matplotlib option is disabled or failed
        if chart_type == 'bar3d':
            chart = Bar3D()
        elif chart_type == 'line3d':
            chart = Line3D()
        else:  # scatter3d
            chart = Scatter3D()
        
        # Prepare 3D data with error handling
        data = []
        for _, row in df.iterrows():
            try:
                x = float(row[selected_columns[0]])
                y = float(row[selected_columns[1]])
                z = float(row[selected_columns[2]])
                data.append([x, y, z])
            except (ValueError, TypeError) as e:
                logging.warning(f"Skipping row due to conversion error: {e}")
                continue
        
        if not data:
            # Create some dummy data if no valid data points
            data = [[0, 0, 0], [1, 1, 1]]
        
        # Configure visualization options
        visualmap_opts = opts.VisualMapOpts(
            dimension=2,
            max_=max(item[2] for item in data),
            min_=min(item[2] for item in data),
            range_color=["#313695", "#4575b4", "#74add1", "#abd9e9", "#e0f3f8", 
                        "#ffffbf", "#fee090", "#fdae61", "#f46d43", "#d73027", "#a50026"]
        )
        
        chart.add(
            series_name="",
            data=data,
            xaxis3d_opts=opts.Axis3DOpts(
                type_="value", 
                name=selected_columns[0],
                name_gap=20
            ),
            yaxis3d_opts=opts.Axis3DOpts(
                type_="value", 
                name=selected_columns[1],
                name_gap=20
            ),
            zaxis3d_opts=opts.Axis3DOpts(
                type_="value", 
                name=selected_columns[2],
                name_gap=20
            ),
            visualmap_opts=visualmap_opts
        )
        
        # Add grid3D options
        chart.set_global_opts(
            title_opts=opts.TitleOpts(title=title),
            visualmap_opts=visualmap_opts,
            grid3d_opts=opts.Grid3DOpts(
                width="80%",
                height="80%", 
                rotate_speed=10,
                is_rotate=True,
                view_control={"distance": 300}
            )
        )
        
        return chart, title

    @staticmethod
    def _create_map(df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any], title: str) -> Tuple[Any, str]:
        """Creates a map visualization."""
        if len(selected_columns) < 2:
            raise ValueError("Map requires at least 2 columns: region, value")
            
        chart = Map()
        
        # Prepare map data with error handling
        data = []
        for _, row in df.iterrows():
            try:
                region = str(row[selected_columns[0]])
                value = float(row[selected_columns[1]])
                data.append((region, value))
            except (ValueError, TypeError) as e:
                logging.warning(f"Skipping row due to conversion error: {e}")
                continue
        
        chart.add(
            series_name="",
            data_pair=data,
            maptype=options.get('maptype', 'world')
        )
        
        # Add visual mapping
        if data:
            chart.set_global_opts(
                visualmap_opts=opts.VisualMapOpts(
                    min_=min(d[1] for d in data) if data else 0,
                    max_=max(d[1] for d in data) if data else 100,
                    is_calculable=True
                )
            )
        
        # Configure options
        EnhancedChartGenerator._configure_common_options(chart, title, options)
        
        return chart, title

    @staticmethod
    def _create_graph(df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any], title: str) -> Tuple[Any, str]:
        """Creates a graph visualization showing relationships."""
        if len(selected_columns) < 2:
            raise ValueError("Graph requires at least 2 columns: source, target")
            
        chart = Graph()
        
        # Prepare nodes and links
        unique_nodes = set()
        for _, row in df.iterrows():
            unique_nodes.add(str(row[selected_columns[0]]))
            unique_nodes.add(str(row[selected_columns[1]]))
        
        nodes = [{"name": name} for name in unique_nodes]
        
        links = []
        for _, row in df.iterrows():
            link = {
                "source": str(row[selected_columns[0]]),
                "target": str(row[selected_columns[1]])
            }
            
            # Add value if available
            if len(selected_columns) > 2:
                try:
                    link["value"] = float(row[selected_columns[2]])
                except (ValueError, TypeError):
                    link["value"] = 1
            else:
                link["value"] = 1
                
            links.append(link)
        
        chart.add(
            series_name="",
            nodes=nodes,
            links=links,
            layout=options.get('layout', 'circular'),
            is_roam=True,
            is_focusnode=True
        )
        
        # Configure options
        EnhancedChartGenerator._configure_common_options(chart, title, options)
        
        return chart, title

    @staticmethod
    def _create_liquid(df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any], title: str) -> Tuple[Any, str]:
        """Creates a liquid fill chart showing percentage values."""
        if len(selected_columns) < 1:
            raise ValueError("Liquid fill chart requires at least 1 column")
            
        # Option to use a custom HTML/SVG implementation for better compatibility
        use_custom_liquid = options.get('use_custom_liquid', True)
        
        if use_custom_liquid:
            try:
                from pyecharts.charts import Page
                from pyecharts.components import Html
                
                # Get the first value and convert to percentage
                try:
                    value = float(df[selected_columns[0]].iloc[0])
                    if value > 1:
                        value = value / 100
                    # Ensure value is between 0 and 1
                    value = max(0, min(1, value))
                except (ValueError, IndexError):
                    value = 0.5  # Default value
                
                # Calculate percentage for display
                percentage = int(value * 100)
                
                # Wave height decreases as value increases
                wave_height = max(3, 10 * (1 - value))
                
                # Create custom SVG liquid fill
                color = options.get('color', '#3498db')  # Default to blue
                
                svg_html = f"""
                <div style="width:100%;height:100%;display:flex;justify-content:center;align-items:center;padding:20px;">
                    <div style="width:90%;max-width:400px;position:relative;aspect-ratio:1/1;">
                        <!-- Container -->
                        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                            <!-- Background circle -->
                            <circle cx="50" cy="50" r="42" fill="white" stroke="{color}" stroke-width="3"/>
                            
                            <!-- Liquid fill with wave animation -->
                            <svg width="100" height="100" viewBox="0 0 100 100">
                                <defs>
                                    <!-- Mask for the liquid -->
                                    <mask id="mask">
                                        <circle cx="50" cy="50" r="40" fill="white"/>
                                    </mask>
                                    
                                    <!-- Wave pattern -->
                                    <pattern id="wave" x="0" y="0" width="100" height="{wave_height}" patternUnits="userSpaceOnUse">
                                        <path d="M0,{wave_height/2} Q25,0 50,{wave_height/2} T100,{wave_height/2} T150,{wave_height/2} V{wave_height} H0 Z" fill="{color}">
                                            <animateTransform
                                                attributeName="transform"
                                                type="translate"
                                                from="0,0"
                                                to="-100,0"
                                                dur="5s"
                                                repeatCount="indefinite"/>
                                        </path>
                                    </pattern>
                                </defs>
                                
                                <!-- Fill with animated wave pattern -->
                                <rect x="0" y="{100 - percentage}" width="100" height="{percentage}" fill="url(#wave)" mask="url(#mask)">
                                </rect>
                            </svg>
                            
                            <!-- Percentage text -->
                            <text x="50" y="55" text-anchor="middle" font-family="Arial" font-size="18" font-weight="bold" fill="{color}">
                                {percentage}%
                            </text>
                        </svg>
                    </div>
                </div>
                """
                
                # Create a Page with HTML component containing the SVG
                page = Page()
                html_component = Html(svg_html)
                page.add(html_component)
                
                # Set page properties to make it display correctly
                page.width = "100%"
                page.height = "100%"
                
                return page, title
                
            except Exception as e:
                logging.error(f"Error creating custom liquid chart: {str(e)}")
                logging.warning("Falling back to pyecharts liquid chart")
                # Fall back to pyecharts
        
        # Use pyecharts if custom option is disabled or failed
        chart = Liquid()

        # Get the first value and convert to percentage if needed
        try:
            value = float(df[selected_columns[0]].iloc[0])
            if value > 1:
                value = value / 100
            # Ensure value is between 0 and 1
            value = max(0, min(1, value))
        except (ValueError, IndexError):
            value = 0.5  # Default value
            
        # Add liquid fill series with simplified configuration
        chart.add(
            series_name=selected_columns[0],
            data=[value],
            is_outline_show=True,
            shape=options.get('shape', 'circle'),
            is_animation=True,
            color=[options.get('color', '#3498db')],
            background_color="#fff",
            outline_itemstyle_opts=opts.ItemStyleOpts(
                border_color=options.get('color', '#3498db'),
                border_width=2
            )
        )

        # Configure options
        EnhancedChartGenerator._configure_common_options(chart, title, options)
        
        return chart, title

    @staticmethod
    def _create_parallel(df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any], title: str) -> Tuple[Any, str]:
        """Creates a parallel coordinates plot for multi-dimensional data analysis."""
        if len(selected_columns) < 2:
            raise ValueError("Parallel coordinates requires at least 2 columns")
            
        chart = Parallel()
        
        # Create schema for parallel axes
        schema = []
        for i, col in enumerate(selected_columns):
            # Calculate min and max values for each dimension for better visualization
            try:
                min_val = df[col].min()
                max_val = df[col].max() 
                if pd.isna(min_val) or pd.isna(max_val):
                    min_val, max_val = 0, 100
            except:
                min_val, max_val = 0, 100
                
            schema.append(
                opts.ParallelAxisOpts(
                    dim=i,
                    name=col,
                    min_=float(min_val) if not pd.isna(min_val) else 0,
                    max_=float(max_val) if not pd.isna(max_val) else 100
                )
            )
        
        # Prepare data with error handling
        data = []
        for _, row in df.iterrows():
            try:
                values = [float(row[col]) for col in selected_columns]
                if all(not pd.isna(v) for v in values):
                    data.append(values)
            except (ValueError, TypeError) as e:
                logging.warning(f"Skipping row due to conversion error: {e}")
                continue
        
        # Add schema directly to the chart
        chart.add_schema(schema)
        
        # Add data series
        chart.add(
            series_name="",
            data=data,
            linestyle_opts=opts.LineStyleOpts(width=1, opacity=0.5)
        )
        
        # Configure options
        EnhancedChartGenerator._configure_common_options(chart, title, options)
        
        return chart, title

    @staticmethod
    def _create_sankey(df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any], title: str) -> Tuple[Any, str]:
        """Creates a Sankey diagram showing flow between entities."""
        if len(selected_columns) < 2:
            raise ValueError("Sankey diagram requires at least 2 columns: source, target")
            
        chart = Sankey()
        
        # Prepare nodes and links
        # Directly use source/target names for data
        nodes_set = set()
        links_data = []
        
        # First pass: collect all unique node names
        for _, row in df.iterrows():
            source = str(row[selected_columns[0]])
            target = str(row[selected_columns[1]])
            
            # Skip self-links as they cause rendering issues
            if source == target:
                continue
                
            nodes_set.add(source)
            nodes_set.add(target)
        
        # Create node list
        nodes_data = [{"name": node} for node in nodes_set]
        
        # Second pass: create links using names directly (not indices)
        for _, row in df.iterrows():
            source = str(row[selected_columns[0]])
            target = str(row[selected_columns[1]])
            
            # Skip self-links as they cause rendering issues
            if source == target:
                continue
                
            try:
                value = float(row[selected_columns[2]]) if len(selected_columns) > 2 else 1
                if value <= 0:
                    value = 1  # Ensure positive value
            except (ValueError, TypeError):
                value = 1  # Default value
                
            links_data.append({
                "source": source,  # Use the name directly
                "target": target,  # Use the name directly
                "value": value
            })
        
        # Add Sankey series (use empty series if no valid data)
        if not nodes_data or not links_data:
            # Create dummy data for empty chart
            chart.add(
                series_name="",
                nodes=[{"name": "No Data"}],
                links=[],
                label_opts=opts.LabelOpts(position="right")
            )
        else:
            chart.add(
                series_name="",
                nodes=nodes_data,
                links=links_data,
                linestyle_opts=opts.LineStyleOpts(
                    opacity=0.3,
                    curve=0.5
                ),
                label_opts=opts.LabelOpts(position="right")
            )
        
        # Configure options
        EnhancedChartGenerator._configure_common_options(chart, title, options)
        
        return chart, title
    
    @staticmethod
    def _create_sunburst(df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any], title: str) -> Tuple[Any, str]:
        """Creates a sunburst chart for hierarchical data visualization."""
        if len(selected_columns) < 1:
            raise ValueError("Sunburst chart requires at least 1 column")
            
        chart = Sunburst()
        
        def create_sunburst_data(df, columns, current_level=0):
            """Recursively create hierarchical data structure for sunburst chart."""
            if current_level >= len(columns) or df.empty:
                return []
            
            try:
                grouped = df.groupby(columns[current_level])
            except KeyError:
                return []  # Column doesn't exist
                
            data = []
            
            for name, group in grouped:
                children = create_sunburst_data(group, columns, current_level + 1)
                node = {
                    "name": str(name),
                    "value": len(group) if not children else None,
                }
                if children:
                    node["children"] = children
                data.append(node)
            
            return data
        
        # Create hierarchical data structure
        data = create_sunburst_data(df, selected_columns)
        
        # Handle empty data
        if not data:
            data = [{"name": "No Data", "value": 0}]
        
        chart.add(
            series_name="",
            data_pair=data,
            radius=[0, '90%']
        )
        
        # Configure options
        EnhancedChartGenerator._configure_common_options(chart, title, options)
        
        return chart, title

    @staticmethod
    def _configure_common_options(chart, title="", options=None):
        """Configure common options for all chart types."""
        options = options or {}
        
        chart.set_global_opts(
            title_opts=opts.TitleOpts(
                title=title,
                subtitle=options.get("subtitle", ""),
                title_textstyle_opts=opts.TextStyleOpts(
                    font_size=16,
                    font_weight="bold"
                )
            ),
            tooltip_opts=opts.TooltipOpts(
                trigger="axis",
                axis_pointer_type="cross",
                background_color="rgba(255,255,255,0.9)",
                border_color="#ccc",
                border_width=1,
                textstyle_opts=opts.TextStyleOpts(color="#333")
            ),
            toolbox_opts=opts.ToolboxOpts(
                feature={
                    "dataZoom": {"yAxisIndex": "none"},
                    "restore": {},
                    "saveAsImage": {},
                    "dataView": {}
                }
            ),
            datazoom_opts=[
                opts.DataZoomOpts(
                    range_start=0,
                    range_end=100
                ),
                opts.DataZoomOpts(
                    type_="inside",
                    range_start=0,
                    range_end=100
                )
            ],
            legend_opts=opts.LegendOpts(
                type_="scroll",
                pos_top="top",
                orient="horizontal"
            )
        )
        
        return chart