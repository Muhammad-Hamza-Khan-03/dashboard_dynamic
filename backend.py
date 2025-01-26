from scipy import stats
import numpy as np
from typing import Dict, Any
import plotly.express as px
import plotly.graph_objects as go
import tempfile
import traceback
from flask import Flask, Response, request, jsonify
from flask_cors import CORS
import sqlite3
import io
import logging
import pandas as pd
import xml.etree.ElementTree as ET
import PyPDF2
from werkzeug.utils import secure_filename
import uuid
from pdfminer.high_level import extract_text
from pdfminer.layout import LAParams
import os

from flask_caching import Cache
from pyecharts import options as opts
from pyecharts.charts import (
    Line, Bar, Pie, Scatter, Boxplot, Grid, EffectScatter,
    Funnel, Gauge, HeatMap, Kline, Radar, TreeMap, Surface3D,
    Bar3D, Line3D, Scatter3D, Map, Graph, Liquid, Parallel,
    Sankey, Sunburst
)
from pyecharts.commons.utils import JsCode
import pandas as pd
import sqlite3
import uuid
import traceback

import sqlite3
import psutil
import datetime
import decimal
import math
import logging
import json
import time
from typing import List, Dict, Any, Generator, Tuple,Optional
from dataclasses import dataclass
from flask import jsonify, request
import traceback

app = Flask(__name__)
cache = Cache(app, config={'CACHE_TYPE': 'simple'})
CORS(app)
logging.basicConfig(level=logging.DEBUG)
CACHE_TIMEOUT = 300  # Cache timeout in seconds
CHUNK_SIZE = 100000  # Maximum rows to fetch at once

def init_db():
    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    -- username TEXT NOT NULL,
    -- email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              );
              ''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS  user_files 
              (file_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(user_id),
    filename TEXT NOT NULL,
    file_type TEXT, --CHECK(file_type IN ('csv', 'xlsx','xls', 'db', 'tsv', 'doc', 'docx', 'txt', 'xml','pdf')),
    is_structured BOOLEAN,
    sheet_table TEXT, -- For Excel sheets or DB tables
    unique_key TEXT,  -- Random unique identifier for structured data storage table
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    );
              ''')
    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()
    
    # Check if parent_file_id column exists
    c.execute("PRAGMA table_info(user_files)")
    columns = [row[1] for row in c.fetchall()]
    
    if 'parent_file_id' not in columns:
        # Add parent_file_id column
        c.execute('''ALTER TABLE user_files 
                    ADD COLUMN parent_file_id INTEGER 
                    REFERENCES user_files(file_id)''')
    
    c.execute('''
    CREATE TABLE IF NOT EXISTS  structured_file_storage (
    unique_key TEXT PRIMARY KEY,
    file_id INTEGER REFERENCES user_files(file_id),
    table_name TEXT NOT NULL, -- Name of dynamically created table for each file
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES user_files(file_id)
    );
              ''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS  unstructured_file_storage (
    file_id INTEGER REFERENCES user_files(file_id),
    unique_key TEXT PRIMARY KEY,
    content BLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_text TEXT,
    FOREIGN KEY (file_id) REFERENCES user_files(file_id)
    );
    ''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS  dashboard_store (
        dashboard_id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER REFERENCES user_files(file_id),
        dashboard_data BLOB,
              user_id TEXT REFERENCES users(user_id),
        dashboard_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ''')
    c.execute('''CREATE TABLE IF NOT EXISTS graph_cache (
        graph_id TEXT PRIMARY KEY,
        html_content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    conn.commit()
    conn.close()

init_db()
        
# class ChartGenerator:
#     """
#     Helper class to generate interactive charts using ECharts.
#     Maintains compatibility with existing frontend while providing better performance.
#     """
#     @staticmethod
#     def create_chart(chart_type, df, selected_columns, options=None):
#         options = options or {}
        
            
#         try:
#             if chart_type == 'histogram':
#                 return ChartGenerator._create_histogram(df, selected_columns, options)
#             elif chart_type == 'segmented-bar':
#                 return ChartGenerator._create_segmented_bar(df, selected_columns, options)
#             # elif chart_type == 'line':
#             #     return ChartGenerator._create_line(df, selected_columns)
#             # elif chart_type == 'bar':
#             #     chart = Bar()
#             #     x_data = df[selected_columns[0]].tolist()
#             #     for col in selected_columns[1:]:
#             #         y_data = df[col].tolist()
#             #         chart.add_xaxis(x_data)
#             #         chart.add_yaxis(col, y_data)
#             elif chart_type in ['line', 'bar']:
#                 x_data = df[selected_columns[0]].tolist()
#                 for col in selected_columns[1:]:
#                     y_data = df[col].tolist()
#                     chart.add_xaxis(x_data)
#                     chart.add_yaxis(
#                         col,
#                         y_data,
#                         label_opts=opts.LabelOpts(
#                             is_show=False,
#                             font_size=12,
#                             rotate=0
#                         )
#                     )        
#             elif chart_type == 'pie':
#                 chart = Pie()
#                 data_pairs = list(zip(
#                     df[selected_columns[0]].tolist(),
#                     df[selected_columns[1]].tolist()
#                 ))
#                 chart.add(
#                     series_name="",
#                     data_pair=data_pairs,
#                     label_opts=opts.LabelOpts(
#                         is_show=True,
#                         formatter="{b}: {c}"
#                     )
#                 )
                
#             elif chart_type == 'scatter':
#                 return ChartGenerator._create_scatter(df, selected_columns)
#             elif chart_type == 'box':
#                 chart = Boxplot()
#                 data = [df[col].tolist() for col in selected_columns[1:]]
#                 chart.add_xaxis([selected_columns[1:]])
#                 chart.add_yaxis("", chart.prepare_data(data))
                
#             else:
#                 raise ValueError(f'Unsupported chart type: {chart_type}')

#             chart.set_global_opts(
#                 # Title configuration
#                 title_opts=opts.TitleOpts(
#                     title="",
#                     subtitle="",
#                     title_textstyle_opts=opts.TextStyleOpts(
#                         font_size=16,
#                         font_weight='bold'
#                     )
#                 ),
                
#                 # Tooltip configuration
#                 tooltip_opts=opts.TooltipOpts(
#                     trigger="axis",
#                     axis_pointer_type="cross"
#                 ),
                
#                 # Toolbox with interactive features
#                 toolbox_opts=opts.ToolboxOpts(
#                     is_show=True,
#                     pos_left="right",
#                     feature={
#                         "dataZoom": {"yAxisIndex": "none"},
#                         "restore": {},
#                         "saveAsImage": {},
#                         "dataView": {}
#                     }
#                 ),
                
#                 # Data zoom for interaction
#                 datazoom_opts=[
#                     opts.DataZoomOpts(
#                         range_start=0,
#                         range_end=100,
#                         is_zoom_lock=False
#                     ),
#                     opts.DataZoomOpts(
#                         type_="inside",
#                         range_start=0,
#                         range_end=100
#                     )
#                 ],
                
#                 # Legend configuration
#                 legend_opts=opts.LegendOpts(
#                     type_="scroll",
#                     pos_top="top",
#                     pos_left="center",
#                     orient="horizontal",
#                     text_style=opts.TextStyleOpts(
#                         font_size=12
#                     )
#                 ),
                
#                 # Grid configuration for main chart area
#                 grid_opts=opts.GridOpts(
#                     pos_left="5%",
#                     pos_right="5%",
#                     pos_top="15%",
#                     pos_bottom="15%",
#                     containLabel=True,
#                     is_contain_label=True
#                 )
#             )
            
#             # Configure the chart instance for responsiveness
#             chart.width = "100%"
#             chart.height = "100%"
#             chart.renderer = "canvas"
            
#             return chart
            
#         except Exception as e:
#             app.logger.error(f"Error creating chart: {str(e)}")
#             raise
        
#     @staticmethod
#     def _create_histogram(df, selected_columns, options):
#         """
#         Creates a histogram using ECharts.
#         Supports customizable bin sizes and multiple series.
#         """
#         # Create a Bar chart (ECharts doesn't have a direct histogram type)
#         chart = Bar()
        
#         # Get bin parameters
#         bin_size = options.get('binSize', 10)
#         column = selected_columns[0]  # Histogram works on a single column
        
#         # Calculate histogram data
#         hist_data = np.histogram(df[column].dropna(), bins=bin_size)
#         bin_edges = hist_data[1]
#         counts = hist_data[0]
        
#         # Create bin labels (use middle of each bin)
#         bin_labels = [f"{bin_edges[i]:.2f}-{bin_edges[i+1]:.2f}" 
#                      for i in range(len(bin_edges)-1)]
        
#         # Add data to chart
#         chart.add_xaxis(bin_labels)
#         chart.add_yaxis("Frequency", counts.tolist(), 
#                        label_opts=opts.LabelOpts(is_show=False))
        
#         # Configure chart options
#         chart.set_global_opts(
#             title_opts=opts.TitleOpts(title=f"Histogram of {column}"),
#             xaxis_opts=opts.AxisOpts(name="Value Ranges"),
#             yaxis_opts=opts.AxisOpts(name="Frequency"),
#             tooltip_opts=opts.TooltipOpts(trigger="axis"),
#             toolbox_opts=opts.ToolboxOpts(
#                 feature={
#                     "dataZoom": {},
#                     "dataView": {},
#                     "saveAsImage": {}
#                 }
#             ),
#             datazoom_opts=[opts.DataZoomOpts()],
#         )
        
#         return chart

#     @staticmethod
#     def _create_segmented_bar(df, selected_columns, options):
#         """
#         Creates a segmented (stacked) bar chart using ECharts.
#         Supports both stacked and percentage stacked modes.
#         """
#         chart = Bar()
#         stack_type = options.get('stackType', 'stack')  # 'stack' or 'percentage'
        
#         # First column is categories (x-axis)
#         x_data = df[selected_columns[0]].unique().tolist()
        
#         # Handle percentage stacking if requested
#         if stack_type == 'percentage':
#             # Calculate percentages for each category
#             total = df.groupby(selected_columns[0])[selected_columns[1:]].sum()
#             for col in selected_columns[1:]:
#                 total[col] = (total[col] / total.sum(axis=1) * 100)
            
#             # Add each series
#             for col in selected_columns[1:]:
#                 y_data = total[col].tolist()
#                 chart.add_yaxis(
#                     col, 
#                     y_data,
#                     stack="stack1",
#                     label_opts=opts.LabelOpts(position="inside", formatter="{c}%")
#                 )
#         else:
#             # Regular stacked bar chart
#             for col in selected_columns[1:]:
#                 y_data = df.groupby(selected_columns[0])[col].sum().tolist()
#                 chart.add_yaxis(
#                     col, 
#                     y_data,
#                     stack="stack1",
#                     label_opts=opts.LabelOpts(position="inside")
#                 )
        
#         # Set x-axis data
#         chart.add_xaxis(x_data)
        
#         # Configure chart options
#         chart.set_global_opts(
#             title_opts=opts.TitleOpts(title=""),
#             tooltip_opts=opts.TooltipOpts(trigger="axis", axis_pointer_type="shadow"),
#             toolbox_opts=opts.ToolboxOpts(
#                 feature={
#                     "dataZoom": {},
#                     "dataView": {},
#                     "saveAsImage": {},
#                     "magicType": {"show": True, "type": ["line", "bar"]}
#                 }
#             ),
#             legend_opts=opts.LegendOpts(pos_top="5%"),
#             datazoom_opts=[opts.DataZoomOpts()],
#         )
        
#         return chart

#     @staticmethod
#     def _create_line(df, selected_columns):
#         """Creates a line chart with multiple series support"""
#         chart = Line()
#         x_data = df[selected_columns[0]].tolist()
        
#         for col in selected_columns[1:]:
#             y_data = df[col].tolist()
#             chart.add_xaxis(x_data)
#             chart.add_yaxis(
#                 col, 
#                 y_data,
#                 label_opts=opts.LabelOpts(is_show=False),
#                 is_smooth=True
#             )
        
#         chart.set_global_opts(
#             title_opts=opts.TitleOpts(title=""),
#             tooltip_opts=opts.TooltipOpts(trigger="axis"),
#             toolbox_opts=opts.ToolboxOpts(
#                 feature={
#                     "dataZoom": {},
#                     "dataView": {},
#                     "saveAsImage": {}
#                 }
#             ),
#             datazoom_opts=[opts.DataZoomOpts()],
#         )
        
#         return chart



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
            'sunburst': Sunburst
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
    ):
        """Creates a responsive chart with the specified type and data."""
        try:
            chart = EnhancedChartGenerator._initialize_chart(chart_type)
            options = options or {}
            
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
                data_pairs = list(zip(
                    df[selected_columns[0]].tolist(),
                    df[selected_columns[1]].tolist()
                ))
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

            # Process data based on chart type
            elif chart_type in ['effect-scatter']:
                return EnhancedChartGenerator._create_effect_scatter(df, selected_columns, options)
            elif chart_type == 'funnel':
                return EnhancedChartGenerator._create_funnel(df, selected_columns, options)
            elif chart_type == 'gauge':
                return EnhancedChartGenerator._create_gauge(df, selected_columns, options)
            elif chart_type == 'heatmap':
                return EnhancedChartGenerator._create_heatmap(df, selected_columns, options)
            elif chart_type == 'kline':
                return EnhancedChartGenerator._create_kline(df, selected_columns, options)
            elif chart_type == 'radar':
                return EnhancedChartGenerator._create_radar(df, selected_columns, options)
            elif chart_type == 'treemap':
                return EnhancedChartGenerator._create_treemap(df, selected_columns, options)
            elif chart_type == 'surface3d':
                return EnhancedChartGenerator._create_surface3d(df, selected_columns, options)
            elif chart_type in ['bar3d', 'line3d', 'scatter3d']:
                return EnhancedChartGenerator._create_3d_chart(chart_type, df, selected_columns, options)
            elif chart_type == 'map':
                return EnhancedChartGenerator._create_map(df, selected_columns, options)
            elif chart_type == 'graph':
                return EnhancedChartGenerator._create_graph(df, selected_columns, options)
            elif chart_type == 'liquid':
                return EnhancedChartGenerator._create_liquid(df, selected_columns, options)
            elif chart_type == 'parallel':
                return EnhancedChartGenerator._create_parallel(df, selected_columns, options)
            elif chart_type == 'sankey':
                return EnhancedChartGenerator._create_sankey(df, selected_columns, options)
            elif chart_type == 'sunburst':
                return EnhancedChartGenerator._create_sunburst(df, selected_columns, options)
             # Configure global options
            chart.set_global_opts(
                title_opts=opts.TitleOpts(
                    title="Chart Title",
                    subtitle="Chart Subtitle",
                    title_textstyle_opts=opts.TextStyleOpts(font_size=16)
                ),
                tooltip_opts=opts.TooltipOpts(trigger="axis"),
                datazoom_opts=[
                    opts.DataZoomOpts(type_="slider"),
                    opts.DataZoomOpts(type_="inside")
                ],
                toolbox_opts=opts.ToolboxOpts(
                    feature={
                        "dataZoom": {},
                        "restore": {},
                        "saveAsImage": {},
                        "dataView": {}
                    }
                ),
                legend_opts=opts.LegendOpts(
                    type_="scroll",
                    pos_top="top",
                    orient="horizontal"
                )
            )
            
            # Set chart to be responsive
            chart.width = "100%"
            chart.height = "100%"
            chart.renderer = "canvas"
            
            # If grid options are provided, add the chart to a Grid instance
            if 'grid_opts' in options:
                grid = Grid()
                grid.add(chart, grid_opts=options['grid_opts'])
                return grid
            return chart
            
        except Exception as e:
            logging.error(f"Error creating chart: {str(e)}")
            raise

    @staticmethod
    def _create_effect_scatter(df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any]):
        """Creates an effect scatter plot with animated effects."""
        chart = EffectScatter()
        
        x_data = df[selected_columns[0]].tolist()
        y_data = df[selected_columns[1]].tolist()
        
        chart.add_xaxis(x_data)
        chart.add_yaxis(
            "",
            y_data,
            symbol_size=options.get('symbol_size', 10),
            effect_opts=opts.EffectOpts(
                brush_type="stroke",
                scale=options.get('effect_scale', 2.5)
            )
        )
        
        chart.set_global_opts(
            title_opts=opts.TitleOpts(title="Effect Scatter Chart"),
            xaxis_opts=opts.AxisOpts(type_="value"),
            yaxis_opts=opts.AxisOpts(type_="value")
        )
        
        return chart

    @staticmethod
    def _create_funnel(df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any]):
        """Creates a funnel chart showing stages in a process."""
        chart = Funnel()
        
        data = [
            (row[selected_columns[0]], row[selected_columns[1]])
            for _, row in df.iterrows()
        ]
        
        chart.add(
            series_name="",
            data_pair=data,
            gap=options.get('gap', 2),
            label_opts=opts.LabelOpts(position="inside")
        )
        
        chart.set_global_opts(title_opts=opts.TitleOpts(title="Funnel Chart"))
        return chart

    @staticmethod
    def _create_gauge(df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any]):
        """Creates a gauge chart showing a single value within a range."""
        chart = Gauge()
        
        # Take the first value from the selected column
        value = df[selected_columns[0]].iloc[0]
        
        chart.add(
            series_name="",
            data_pair=[("", value)],
            min_=options.get('min', 0),
            max_=options.get('max', 100)
        )
        
        return chart

    @staticmethod
    def _create_heatmap(df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any]):
        """Creates a heatmap showing data density."""
        chart = HeatMap()
        
        # Create heatmap data from selected columns
        x_axis = df[selected_columns[0]].unique().tolist()
        y_axis = df[selected_columns[1]].unique().tolist()
        
        data = [[i, j, df[
            (df[selected_columns[0]] == x) & 
            (df[selected_columns[1]] == y)
        ][selected_columns[2]].mean()] 
            for i, x in enumerate(x_axis) 
            for j, y in enumerate(y_axis)
        ]
        
        chart.add_xaxis(x_axis)
        chart.add_yaxis(
            "",
            y_axis,
            data,
            label_opts=opts.LabelOpts(is_show=True)
        )
        
        chart.set_global_opts(
            title_opts=opts.TitleOpts(title="Heat Map"),
            visualmap_opts=opts.VisualMapOpts()
        )
        
        return chart

    @staticmethod
    def _create_kline(df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any]):
        """Creates a K-line (candlestick) chart for financial data."""
        chart = Kline()
        
        # Expect columns: date, open, close, low, high
        data = [
            [
                row[selected_columns[1]],  # open
                row[selected_columns[2]],  # close
                row[selected_columns[3]],  # low
                row[selected_columns[4]]   # high
            ]
            for _, row in df.iterrows()
        ]
        
        chart.add_xaxis(df[selected_columns[0]].tolist())  # dates
        chart.add_yaxis(
            "",
            data,
            itemstyle_opts=opts.ItemStyleOpts(color="#ec0000", color0="#00da3c")
        )
        
        return chart

    @staticmethod
    def _create_radar(df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any]):
        """Creates a radar chart comparing multiple variables."""
        chart = Radar()
        
        # Create indicator config from columns
        indicators = [
            opts.RadarIndicatorItem(name=col, max_=df[col].max())
            for col in selected_columns[1:]
        ]
        
        # Prepare data for each category
        categories = df[selected_columns[0]].unique()
        data = []
        for category in categories:
            category_data = df[df[selected_columns[0]] == category][selected_columns[1:]].iloc[0].tolist()
            data.append({"value": category_data, "name": str(category)})
        
        chart.add_schema(schema=indicators)
        chart.add("", data)
        
        return chart

    @staticmethod
    def _create_treemap(df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any]):
        """Creates a treemap for hierarchical data visualization."""
        chart = TreeMap()
        
        def create_tree_data(df, columns, current_level=0):
            if current_level >= len(columns):
                return []
            
            grouped = df.groupby(columns[current_level])
            data = []
            
            for name, group in grouped:
                children = create_tree_data(group, columns, current_level + 1)
                node = {
                    "name": str(name),
                    "value": len(group) if not children else None,
                }
                if children:
                    node["children"] = children
                data.append(node)
            
            return data
        
        data = create_tree_data(df, selected_columns)
        
        chart.add(
            series_name="",
            data=data,
            leaf_depth=options.get('leaf_depth', 1)
        )
        
        return chart

    @staticmethod
    def _create_surface3d(df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any]):
        """Creates a 3D surface chart."""
        chart = Surface3D()
        
        # Create 3D surface data from three columns
        x_data = df[selected_columns[0]].unique()
        y_data = df[selected_columns[1]].unique()
        
        data = [[
            x, y, df[
                (df[selected_columns[0]] == x) & 
                (df[selected_columns[1]] == y)
            ][selected_columns[2]].iloc[0]
        ] for x in x_data for y in y_data]
        
        chart.add(
            series_name="",
            data=data,
            shading="realistic",
            itemstyle_opts=opts.ItemStyleOpts(opacity=0.8)
        )
        
        return chart

    @staticmethod
    def _create_3d_chart(chart_type: str, df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any]):
        """Creates various types of 3D charts (bar, line, scatter)."""
        if chart_type == 'bar3d':
            chart = Bar3D()
        elif chart_type == 'line3d':
            chart = Line3D()
        else:  # scatter3d
            chart = Scatter3D()
        
        data = [[
            row[selected_columns[0]],
            row[selected_columns[1]],
            row[selected_columns[2]]
        ] for _, row in df.iterrows()]
        
        chart.add(
            series_name="",
            data=data,
            xaxis3d_opts=opts.Axis3DOpts(type_="value"),
            yaxis3d_opts=opts.Axis3DOpts(type_="value"),
            zaxis3d_opts=opts.Axis3DOpts(type_="value")
        )
        
        return chart

    @staticmethod
    def _create_map(df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any]):
        """Creates a map visualization."""
        chart = Map()
        
        # Prepare map data
        data = [
            (row[selected_columns[0]], row[selected_columns[1]])
            for _, row in df.iterrows()
        ]
        
        chart.add(
            series_name="",
            data_pair=data,
            maptype=options.get('maptype', 'world')
        )
        
        chart.set_global_opts(
            title_opts=opts.TitleOpts(title="Map"),
            visualmap_opts=opts.VisualMapOpts()
        )
        
        return chart

    @staticmethod
    def _create_graph(df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any]):
        """Creates a graph visualization showing relationships."""
        chart = Graph()
        
        # Prepare nodes and links
        nodes = [{"name": str(name)} for name in df[selected_columns[0]].unique()]
        links = [
            {
                "source": str(row[selected_columns[0]]),
                "target": str(row[selected_columns[1]]),
                "value": row[selected_columns[2]] if len(selected_columns) > 2 else 1
            }
            for _, row in df.iterrows()
        ]
        
        chart.add(
            series_name="",
            nodes=nodes,
            links=links,
            layout=options.get('layout', 'circular'),
            is_roam=True,
            is_focusnode=True
        )
        
        return chart

    @staticmethod
    def _create_liquid(df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any]):
        """Creates a liquid fill chart showing percentage values."""
        chart = Liquid()
        
        # Get the first value from the selected column as percentage
        value = df[selected_columns[0]].iloc[0] / 100.0
        
        chart.add(
            series_name="",
            data=[value],
            label_opts=opts.LabelOpts(
                font_size=50,
                formatter=JsCode(
                    "function(param){return Math.floor(param.value * 100) + '%';}"
                ),
                position="inside"
            )
        )
        
        chart.set_global_opts(title_opts=opts.TitleOpts(title="Liquid Fill"))
        return chart

    @staticmethod
    def _create_parallel(df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any]):
        """Creates a parallel coordinates plot for multi-dimensional data analysis."""
        chart = Parallel()
        
        # Create schema for parallel axes
        schema = [
            {"dim": i, "name": col, "type": "value"}
            for i, col in enumerate(selected_columns)
        ]
        
        # Prepare data
        data = df[selected_columns].values.tolist()
        
        chart.add(
            series_name="",
            data=data,
            linestyle_opts=opts.LineStyleOpts(width=1, opacity=0.5),
            schema=schema
        )
        
        chart.set_global_opts(title_opts=opts.TitleOpts(title="Parallel"))
        return chart

    @staticmethod
    def _create_sankey(df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any]):
        """Creates a Sankey diagram showing flow between entities."""
        chart = Sankey()
        
        # Prepare nodes and links
        nodes = []
        node_map = {}
        current_node = 0
        
        # Create nodes
        for col in selected_columns[:2]:  # Source and target columns
            for value in df[col].unique():
                if value not in node_map:
                    node_map[value] = current_node
                    nodes.append({"name": str(value)})
                    current_node += 1
        
        # Create links
        links = []
        for _, row in df.iterrows():
            source = str(row[selected_columns[0]])
            target = str(row[selected_columns[1]])
            value = row[selected_columns[2]] if len(selected_columns) > 2 else 1
            
            links.append({
                "source": node_map[source],
                "target": node_map[target],
                "value": value
            })
        
        chart.add(
            series_name="",
            nodes=nodes,
            links=links,
            linestyle_opts=opts.LineStyleOpts(opacity=0.3, curve=0.5),
            label_opts=opts.LabelOpts(position="right")
        )
        
        chart.set_global_opts(title_opts=opts.TitleOpts(title="Sankey Diagram"))
        return chart

    @staticmethod
    def _create_sunburst(df: pd.DataFrame, selected_columns: List[str], options: Dict[str, Any]):
        """Creates a sunburst chart for hierarchical data visualization."""
        chart = Sunburst()
        
        def create_sunburst_data(df, columns, current_level=0):
            """Recursively create hierarchical data structure for sunburst chart."""
            if current_level >= len(columns):
                return []
            
            grouped = df.groupby(columns[current_level])
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
        
        chart.add(
            series_name="",
            data_pair=data,
            radius=[0, '90%'],
            label_opts=opts.LabelOpts(
                position="inside",
                formatter="{b}"
            )
        )
        
        chart.set_global_opts(
            title_opts=opts.TitleOpts(title="Sunburst Chart"),
            toolbox_opts=opts.ToolboxOpts(
                feature={
                    "saveAsImage": {},
                    "dataView": {},
                    "restore": {}
                }
            )
        )
        
        return chart

    def _configure_common_options(chart, title="", options: Dict[str, Any] = None):
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
                axis_pointer_type="cross"
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
   

@cache.memoize(timeout=CACHE_TIMEOUT)
def get_table_data(table_name, selected_columns):
    """
    Fetch and cache data from database.
    Only retrieves requested columns for better performance.
    """
    try:
        conn = sqlite3.connect('user_files.db')
        # Only select requested columns
        columns_str = ', '.join(f'"{col}"' for col in selected_columns)
        query = f'SELECT {columns_str} FROM "{table_name}" LIMIT {CHUNK_SIZE}'
        
        df = pd.read_sql_query(query, conn)
        return df
    finally:
        if conn:
            conn.close()        
def process_pdf_content(pdf_content):
    """Process PDF content and return text with formatting preserved"""
    try:
        # Create a temporary file to write PDF content
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
            temp_file.write(pdf_content)
            temp_path = temp_file.name

        try:
            # Use pdfminer for better text extraction
            text = extract_text(
                temp_path,
                laparams=LAParams(
                    line_margin=0.5,
                    word_margin=0.1,
                    boxes_flow=0.5,
                    detect_vertical=True
                )
            )
            
            # Clean up extracted text
            text = '\n'.join(line.strip() for line in text.split('\n') if line.strip())
            return text
        finally:
            # Clean up temporary file
            os.unlink(temp_path)

    except Exception as e:
        logging.error(f"Error processing PDF: {str(e)}")
        return None

def handle_sqlite_upload(file, user_id, filename, c, conn):
    """Handle SQLite file by extracting tables and storing them similarly to Excel sheets."""
    try:
        content = file.read()
        with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name

        # Connect to the uploaded (temporary) SQLite database
        temp_conn = sqlite3.connect(temp_path)
        temp_cursor = temp_conn.cursor()

        # Fetch all tables except internal sqlite_* tables
        tables_query = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
        temp_cursor.execute(tables_query)
        tables = temp_cursor.fetchall()

        if not tables:
            raise ValueError("No tables found in the uploaded SQLite database.")

        # Create parent file entry with no specific table
        parent_unique_key = str(uuid.uuid4())
        c.execute("""
            INSERT INTO user_files (user_id, filename, file_type, is_structured, unique_key)
            VALUES (?, ?, ?, ?, ?)
        """, (user_id, filename, 'db', True, parent_unique_key))
        parent_file_id = c.lastrowid

        # Process each table and create separate entries in user_files
        for table_name, in tables:
            try:
                # Read table data
                df = pd.read_sql_query(f"SELECT * FROM '{table_name}'", temp_conn)
                
                # Generate unique key for this table
                table_unique_key = str(uuid.uuid4())
                
                # Create new table name
                new_table_name = f"table_{table_unique_key}"
                
                # Store data in new table
                df.to_sql(new_table_name, conn, index=False, if_exists='replace')
                
                # Create entry in user_files for this table
                c.execute("""
                    INSERT INTO user_files (
                        user_id, filename, file_type, is_structured, 
                        unique_key, sheet_table, parent_file_id
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (user_id, f"{filename}:{table_name}", 'db', True, 
                      table_unique_key, table_name, parent_file_id))

            except Exception as e:
                app.logger.error(f"Error processing table {table_name}: {str(e)}")
                continue

        temp_conn.close()
        os.unlink(temp_path)

        conn.commit()
        return parent_file_id

    except Exception as e:
        app.logger.error(f"Error in handle_sqlite_upload: {str(e)}")
        if 'temp_conn' in locals():
            temp_conn.close()
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.unlink(temp_path)
        raise


@app.route('/upload/<user_id>', methods=['POST'])
def upload_file(user_id):
    app.logger.info(f"Received upload request for user: {user_id}")
    
    if 'file' not in request.files:
        app.logger.warning("No file part in the request")
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        app.logger.warning("No selected file")
        return jsonify({'error': 'No selected file'}), 400

    filename = secure_filename(file.filename)# was not in earlier one
    extension = filename.split('.')[-1].lower()
    
    allowed_extensions = {'csv', 'xlsx', 'xls', 'db', 'txt', 'tsv', 'pdf', 'xml', 'docx', 'doc'}
    structured_extensions = {'csv', 'xlsx', 'xls', 'db', 'tsv','sqlite','sqlite3'}
    unstructured_extensions = {'txt', 'pdf', 'xml', 'docx', 'doc'}
    
    if extension not in allowed_extensions:
        return jsonify({'error': 'Invalid file type'}), 400

    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()

    try:
        # Ensure user exists
        c.execute("INSERT OR IGNORE INTO users (user_id) VALUES (?)", (user_id,))

        file_id = None
        if extension in structured_extensions:
            # Handle different file types
            if extension in ['xlsx', 'xls']: #2
                file_id = handle_excel_upload(file, user_id, filename, c, conn)
            elif extension in ['db', 'sqlite', 'sqlite3']:
                file_id = handle_sqlite_upload(file, user_id, filename, c, conn)
            elif extension in {'csv','tsv'}: #1
                # Handle CSV files (implement similar parent-child structure if needed)
                unique_key = str(uuid.uuid4())
                df = pd.read_csv(file)
                table_name = f"table_{unique_key}"
                df.to_sql(table_name, conn, if_exists='replace', index=False)

                c.execute("""
                    INSERT INTO user_files (user_id, filename, file_type, is_structured, unique_key)
                    VALUES (?, ?, ?, ?, ?)
                """, (user_id, filename, 'csv', True, unique_key))
                file_id = c.lastrowid
                # Insert into 'structured_file_storage'
                c.execute("""
                    INSERT INTO structured_file_storage (unique_key, file_id, table_name)
                    VALUES (?, ?, ?)
                """, (unique_key, file_id, table_name))

            conn.commit()
            return jsonify({
                'success': True,
                'file_id': file_id,
                'message': 'File uploaded successfully'
            }), 200
        elif extension in unstructured_extensions:
            if extension =='pdf':
               content = file.read()
            
               # Process PDF content immediately during upload
               processed_text = process_pdf_content(content)
               if not processed_text:
                   return 'Error processing PDF', 500
                   
               unique_key = str(uuid.uuid4())
               
               # Store file metadata
               c.execute("""
                   INSERT INTO user_files 
                   (user_id, filename, file_type, is_structured, unique_key)
                   VALUES (?, ?, ?, ?, ?)
               """, (user_id, file.filename, extension, False, unique_key))
               file_id = c.lastrowid
                   # Store processed text content
               c.execute("""
                   INSERT INTO unstructured_file_storage 
                   (file_id, unique_key, content)
                   VALUES (?, ?, ?)
               """, (file_id, unique_key, processed_text))
            else:   
                content = file.read()
                unique_key = str(uuid.uuid4())
                # Insert metadata into 'user_files'
                c.execute("""
                    INSERT INTO user_files (user_id, filename, file_type, is_structured,unique_key)
                    VALUES (?, ?, ?, ?,?)
                """, (user_id, file.filename, extension, False,unique_key))
                file_id = c.lastrowid

                # Insert the content into 'unstructured_file_storage'
                c.execute("""
                    INSERT INTO unstructured_file_storage (file_id,unique_key, content)
                    VALUES (?,?, ?)
                """, (file_id, unique_key, content)) 
        conn.commit()
        app.logger.info(f"File uploaded successfully for user {user_id}")
        return 'File Uploaded successfully',200
    except Exception as e:
        conn.rollback()
        app.logger.error(f"Error during file upload: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

    finally:
        conn.close()

@app.route('/update-row/<user_id>/<file_id>', methods=['POST'])
def update_row(user_id, file_id):
    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()
    
    try:
        # Get file metadata
        c.execute("""
            SELECT f.is_structured, f.unique_key
            FROM user_files f
            WHERE f.file_id = ? AND f.user_id = ?
        """, (file_id, user_id))
        
        result = c.fetchone()
        if not result:
            return jsonify({'error': 'File not found'}), 404
            
        is_structured, unique_key = result
        table_name = "table_" + unique_key
        if not table_name:
            return jsonify({'error': 'Table name not found'}), 404
            
        data = request.json
        
        if is_structured:
            edit_item = data.get('editItem', {})
            # Process empty or null values
            processed_item = {}
            
            # Get column types from the table
            c.execute(f'PRAGMA table_info("{table_name}")')
            columns_info = {col[1]: col[2] for col in c.fetchall()}
            
            for key, value in edit_item.items():
                # Handle different SQL types appropriately
                if value is None:
                    processed_item[key] = None
                else:
                    col_type = columns_info.get(key, '').upper()
                    if 'INT' in col_type:
                        processed_item[key] = int(value) if value != '' else None
                    elif 'REAL' in col_type or 'FLOAT' in col_type:
                        processed_item[key] = float(value) if value != '' else None
                    elif 'BOOL' in col_type:
                        processed_item[key] = bool(value) if value != '' else None
                    else:
                        # For text/varchar types, empty string is kept as empty string
                        processed_item[key] = value
            
            if processed_item:
                quoted_table = f'"{table_name}"'
                
                if data.get('editIndex') is not None:  # Update existing row
                    row_query = f'SELECT ROWID FROM {quoted_table} LIMIT 1 OFFSET ?'
                    c.execute(row_query, (data['editIndex'],))
                    row_result = c.fetchone()
                    
                    if row_result:
                        row_id = row_result[0]
                        set_clause = ', '.join([f'"{k}" = ?' for k in processed_item.keys()])
                        values = list(processed_item.values())
                        
                        update_query = f'''
                            UPDATE {quoted_table} 
                            SET {set_clause} 
                            WHERE ROWID = ?
                        '''
                        c.execute(update_query, values + [row_id])
                        
                        # Fetch updated row
                        c.execute(f'SELECT * FROM {quoted_table} WHERE ROWID = ?', [row_id])
                        
                else:  # Create new row
                    columns = [f'"{k}"' for k in processed_item.keys()]
                    values = list(processed_item.values())
                    placeholders = ','.join(['?' for _ in values])
                    
                    insert_query = f'''
                        INSERT INTO {quoted_table} ({','.join(columns)})
                        VALUES ({placeholders})
                    '''
                    c.execute(insert_query, values)
                    
                    # Fetch the new row
                    c.execute(f'SELECT * FROM {quoted_table} WHERE ROWID = last_insert_rowid()')
                
                columns = [description[0] for description in c.description]
                row = c.fetchone()
                if row:
                    updated_row = dict(zip(columns, row))
                    conn.commit()
                    return jsonify({
                        'success': True,
                        'data': updated_row
                    })
                else:
                    raise Exception("Failed to retrieve updated row")
            else:
                return jsonify({'error': 'No valid data provided for update'}), 400            
        else:  # Unstructured data handling remains the same
            c.execute("""
                SELECT content 
                FROM unstructured_file_storage 
                WHERE file_id = ? AND unique_key = ?
            """, (file_id, unique_key))
            
            result = c.fetchone()
            if not result:
                return jsonify({'error': 'Content not found'}), 404
                
            content = result[0]
            try:
                content_str = content.decode('utf-8') if isinstance(content, bytes) else content
                lines = content_str.split('\n')
            except Exception as e:
                app.logger.error(f"Error decoding content: {str(e)}")
                lines = []
            
            edit_index = data.get('editIndex')
            edit_item = data.get('editItem', {})
            new_content = edit_item.get('content', '')
            
            if edit_index is not None and 0 <= edit_index < len(lines):
                lines[edit_index] = new_content
            else:
                lines.append(new_content)
                
            final_content = '\n'.join(lines)
            
            c.execute("""
                UPDATE unstructured_file_storage 
                SET content = ? 
                WHERE file_id = ? AND unique_key = ?
            """, (final_content, file_id, unique_key))
            
            conn.commit()
            return jsonify({
                'success': True,
                'data': {'content': new_content}
            })
            
    except Exception as e:
        conn.rollback()
        app.logger.error(f"Error in row operation: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/search-pdf/<user_id>/<file_id>', methods=['POST'])
def search_pdf(user_id, file_id):
    query = request.json.get('query', '').lower()
    if not query:
        return jsonify({'error': 'No search query provided'}), 400

    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()

    try:
        # Get PDF content
        c.execute("""
            SELECT ufs.content
            FROM unstructured_file_storage ufs
            JOIN user_files uf ON ufs.file_id = uf.file_id
            WHERE uf.file_id = ? AND uf.user_id = ? AND uf.file_type = 'pdf'
        """, (file_id, user_id))

        result = c.fetchone()
        if not result:
            return jsonify({'error': 'PDF not found'}), 404

        content = result[0]
        
        # Search for query in content
        lines = content.split('\n')
        matches = []
        
        for i, line in enumerate(lines):
            if query in line.lower():
                context_start = max(0, i - 2)
                context_end = min(len(lines), i + 3)
                matches.append({
                    'line_number': i + 1,
                    'context': '\n'.join(lines[context_start:context_end]),
                    'matched_text': line
                })

        return jsonify({
            'matches': matches,
            'total_matches': len(matches)
        })

    except Exception as e:
        logging.error(f"Error searching PDF: {str(e)}")
        return jsonify({'error': str(e)}), 500

    finally:
        conn.close()
@app.route('/delete-rows/<user_id>/<file_id>', methods=['POST'])
def delete_rows(user_id, file_id):
    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()
    
    try:
        # Get file metadata
        c.execute("""
            SELECT f.is_structured, f.unique_key
            FROM user_files f
            WHERE f.file_id = ? AND f.user_id = ?
        """, (file_id, user_id))
        
        result = c.fetchone()
        if not result:
            return jsonify({'error': 'File not found'}), 404
            
        is_structured, unique_key= result
        table_name = "table_" + unique_key
        if not table_name and is_structured:
            return jsonify({'error': 'Table name not found'}), 404
            
        indices = request.json.get('indices', [])
        
        if not indices:
            return jsonify({'error': 'No indices provided for deletion'}), 400
        
        if is_structured:
            # Properly quote table name
            quoted_table = f'"{table_name}"'
            
            # Delete rows one by one using ROWID
            for index in indices:
                # First get the ROWID for the index
                c.execute(f'SELECT ROWID FROM {quoted_table} LIMIT 1 OFFSET ?', (index,))
                row_result = c.fetchone()
                if row_result:
                    row_id = row_result[0]
                    c.execute(f'DELETE FROM {quoted_table} WHERE ROWID = ?', (row_id,))
            
        else:
            # Handle unstructured data
            c.execute("""
                SELECT content 
                FROM unstructured_file_storage 
                WHERE file_id = ? AND unique_key = ?
            """, (file_id, unique_key))
            
            result = c.fetchone()
            if not result:
                return jsonify({'error': 'Content not found'}), 404
                
            content = result[0]
            try:
                content_str = content.decode('utf-8') if isinstance(content, bytes) else content
                lines = content_str.split('\n')
                
                # Create new content without deleted lines
                new_lines = [line for i, line in enumerate(lines) if i not in indices]
                new_content = '\n'.join(new_lines)
                
                c.execute("""
                    UPDATE unstructured_file_storage 
                    SET content = ? 
                    WHERE file_id = ? AND unique_key = ?
                """, (new_content, file_id, unique_key))
                
            except Exception as e:
                app.logger.error(f"Error processing content: {str(e)}")
                return jsonify({'error': 'Error processing content'}), 500
        
        conn.commit()
        return jsonify({'success': True})
        
    except Exception as e:
        conn.rollback()
        app.logger.error(f"Error deleting rows: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/list_files/<user_id>', methods=['GET'])
def list_files(user_id):
    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()
    try:
        c.execute("""
            SELECT file_id, filename, file_type, is_structured, created_at,unique_key,parent_file_id
            FROM user_files
            WHERE user_id = ? 
        """, (user_id,))
        files = c.fetchall()
        file_list = [
            {
                'file_id': f[0],
                'filename': f[1],
                'file_type': f[2],
                'is_structured': bool(f[3]),
                'created_at': f[4],
                'unique_key': f[5]
            } for f in files if f[2] == 'csv' or f[2] =='pdf' or f[6] is not None
        ]
        return jsonify({'files': file_list}), 200
    except Exception as e:
        app.logger.error(f"Error listing files: {str(e)}")
        return f'Error listing files: {str(e)}', 500
    finally:
        conn.close()

def handle_excel_upload(file, user_id, filename, c, conn):
    """Handle Excel file by extracting sheets and storing them similarly to DB tables."""
    try:
        # Read Excel file
        df_excel = pd.ExcelFile(file)
        sheet_names = df_excel.sheet_names
        
        if not sheet_names:
            raise ValueError("No sheets found in the Excel file.")

        # Create parent file entry
        parent_unique_key = str(uuid.uuid4())
        c.execute("""
            INSERT INTO user_files (user_id, filename, file_type, is_structured, unique_key)
            VALUES (?, ?, ?, ?, ?)
        """, (user_id, filename, filename.split('.')[-1].lower(), True, parent_unique_key))
        parent_file_id = c.lastrowid
        
        app.logger.info(f"Created parent entry for Excel file: {parent_file_id}")

        # Process each sheet
        for sheet_name in sheet_names:
            try:
                # Read sheet data
                df = pd.read_excel(df_excel, sheet_name=sheet_name)
                
                # Generate unique key for this sheet
                sheet_unique_key = str(uuid.uuid4())
                
                # Create new table name
                table_name = f"table_{sheet_unique_key}"
                
                # Store sheet data in new table
                df.to_sql(table_name, conn, index=False, if_exists='replace')
                
                # Create entry in user_files for this sheet
                c.execute("""
                    INSERT INTO user_files (
                        user_id, filename, file_type, is_structured, 
                        unique_key, sheet_table, parent_file_id
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (user_id, f"{filename}:{sheet_name}", filename.split('.')[-1].lower(), 
                      True, sheet_unique_key, sheet_name, parent_file_id))

                app.logger.info(f"Processed sheet {sheet_name} as {table_name}")

            except Exception as e:
                app.logger.error(f"Error processing sheet {sheet_name}: {str(e)}")
                continue

        conn.commit()
        return parent_file_id

    except Exception as e:
        app.logger.error(f"Error in handle_excel_upload: {str(e)}")
        raise

@app.route('/get-file/<user_id>/<file_id>', methods=['GET'])
def get_file(user_id, file_id):
    
    page = request.args.get('page',1,type=int)
    page_size = request.args.get('page_size', 50, type=int)
    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()
    
    try:
        # Get file metadata
        c.execute("""
            SELECT filename, file_type, is_structured, unique_key, sheet_table,parent_file_id
            FROM user_files
            WHERE file_id = ? AND user_id = ?
        """, (file_id, user_id))
        
        file_info = c.fetchone()
        app.logger.debug(f"File info: {file_info}")
        
        if not file_info:
            return jsonify({'error': 'File not found'}), 404
            
        filename, file_type, is_structured, unique_key,sheet_table, parent_file_id = file_info

        if is_structured:
            # Handle parent files (Excel workbooks or DB files)
            if parent_file_id is None and file_type in ['xlsx', 'xls', 'db', 'sqlite', 'sqlite3']:
                c.execute("""
                    SELECT file_id, sheet_table, filename
                    FROM user_files
                    WHERE parent_file_id = ? AND user_id = ?
                    ORDER BY sheet_table
                """, (file_id, user_id))

                sheets = c.fetchall()
                app.logger.debug(f"Found child entries: {sheets}")

                return jsonify({
                    'type': 'structured',
                    'file_type': file_type,
                    'tables': [{
                        'id': str(row[0]),
                        'name': row[1],
                        'full_name': row[2]
                    } for row in sheets]
                })


            # Get the table name for this sheet/table
            table_name = f"table_{unique_key}"
            app.logger.debug(f"Looking for table: {table_name}")

            # Verify table exists
            c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
            if not c.fetchone():
                return jsonify({'error': f'Table not found: {table_name}'}), 404

            # Get pagination parameters
            page = request.args.get('page', 1, type=int)
            page_size = request.args.get('page_size', 50, type=int)
            offset = (page - 1) * page_size

            # Get total rows
            c.execute(f"SELECT COUNT(*) FROM '{table_name}'")
            total_rows = c.fetchone()[0]

            # Get columns
            c.execute(f"PRAGMA table_info('{table_name}')")
            columns = [col[1] for col in c.fetchall()]

            # Get paginated data
            c.execute(f"""
                SELECT * FROM '{table_name}'
                LIMIT ? OFFSET ?
            """, (page_size, offset))

            rows = c.fetchall()
            app.logger.debug(f"Retrieved {len(rows)} rows from {table_name}")

            # Convert to list of dictionaries
            data = []
            for row in rows:
                row_dict = {}
                for i, value in enumerate(row):
                    row_dict[columns[i]] = value
                data.append(row_dict)

            return jsonify({
                'type': 'structured',
                'file_type': file_type,
                'columns': columns,
                'data': data,
                'pagination': {
                    'total_rows': total_rows,
                    'page': page,
                    'page_size': page_size,
                    'total_pages': (total_rows + page_size - 1) // page_size
                }
            })

        else: #unstructered data
            c.execute("""
                 SELECT content FROM unstructured_file_storage
                 WHERE file_id = ? AND unique_key = ?
             """, (file_id, unique_key))
            result = c.fetchone()
            
            if not result:
                return jsonify({'error': 'Unstructured data not found'}), 404
                
            content = result[0]

            if file_type in ['txt', 'docx', 'doc']:
                try:
                    decoded_content = content.decode('utf-8')
                except UnicodeDecodeError:
                    decoded_content = content.decode('latin1')
                    
                response_data = {
                    'type': 'unstructured',
                    'file_type': file_type,
                    'content': decoded_content,
                    'editable': True
                }
            elif file_type == 'pdf':
                c.execute("""
                SELECT content FROM unstructured_file_storage
                WHERE file_id = ? AND unique_key = ?
                """, (file_id, unique_key))
            
                result = c.fetchone()
                if not result:
                    return jsonify({'error': 'PDF content not found'}), 404

                content = result[0]

                # Content is already processed text, return directly
                response_data = {
                    'type': 'unstructured',
                    'file_type': file_type,
                    'content': content,
                    'editable': True
                }

                return jsonify(response_data)
    except Exception as e:
        app.logger.error(f"Error retrieving file: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

    finally:
        conn.close()

@app.route('/get-tables/<user_id>/<file_id>', methods=['GET'])
def get_tables(user_id, file_id):
    """Get available tables/sheets for a file."""
    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()
    
    try:
        # Get file type first
        c.execute("""
            SELECT file_type, is_structured
            FROM user_files
            WHERE file_id = ? AND user_id = ?
        """, (file_id, user_id))
        
        file_info = c.fetchone()
        if not file_info:
            app.logger.error(f"File not found: {file_id}")
            return jsonify({'error': 'File not found'}), 404
            
        file_type, is_structured = file_info
        app.logger.info(f"File type: {file_type}, Is structured: {is_structured}")

        # For SQLite files, get tables from structured_file_storage
        if file_type == 'db':
            c.execute("""
                SELECT table_name
                FROM structured_file_storage
                WHERE file_id = ?
            """, (file_id,))
            tables = c.fetchall()
            app.logger.info(f"Found {len(tables)} tables for DB file")
            
            return jsonify({
                'tables': [{
                    'id': file_id,
                    'name': row[0],
                    'full_name': f"{file_id}_{row[0]}"
                } for row in tables]
            })
        
        # For Excel files, get sheets from user_files
        elif file_type in ['xlsx', 'xls']:
            c.execute("""
                SELECT file_id, sheet_table
                FROM user_files
                WHERE parent_file_id = ? AND user_id = ?
                ORDER BY sheet_table
            """, (file_id, user_id))
            
            sheets = c.fetchall()
            app.logger.info(f"Found {len(sheets)} sheets for Excel file")
            
            return jsonify({
                'tables': [{
                    'id': str(row[0]),
                    'name': row[1],
                    'full_name': f"{file_id}_{row[1]}"
                } for row in sheets]
            })
        
        else:
            return jsonify({'error': 'Unsupported file type'}), 400
            
    except Exception as e:
        app.logger.error(f"Error getting tables: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/get-sheets/<user_id>/<file_id>', methods=['GET'])
def get_sheets(user_id, file_id):
    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()
    
    try:
        # Get file metadata and check if it's an Excel file
        c.execute("""
            SELECT filename, unique_key, file_type
            FROM user_files
            WHERE file_id = ? AND user_id = ? AND file_type IN ('xlsx', 'xls')
        """, (file_id, user_id))
        
        result = c.fetchone()
        if not result:
            return jsonify({'error': 'Excel file not found'}), 404
            
        _, unique_key, _ = result
        
        # Get all sheets for this file
        c.execute("""
            SELECT sheet_table
            FROM user_files
            WHERE unique_key = ? AND sheet_table IS NOT NULL
        """, (unique_key,))
        
        sheets = [row[0] for row in c.fetchall()]
        return jsonify({'sheets': sheets})
        
    except Exception as e:
        app.logger.error(f"Error getting sheets: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
################################################      

# Add a new route for saving unstructured content
@app.route('/save-unstructured/<user_id>/<file_id>', methods=['POST'])
def save_unstructured(user_id, file_id):
    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()
    
    try:
        # Verify file ownership and type
        c.execute("""
            SELECT file_type, unique_key
            FROM user_files
            WHERE file_id = ? AND user_id = ? AND is_structured = 0
        """, (file_id, user_id))
        
        result = c.fetchone()
        if not result:
            return jsonify({'error': 'File not found or not unstructured'}), 404
            
        file_type, unique_key = result
        
        # Get the new content from request
        new_content = request.json.get('content')
        if not new_content:
            return jsonify({'error': 'No content provided'}), 400
            
        # Convert string content to bytes
        if isinstance(new_content, str):
            content_bytes = new_content.encode('utf-8')
        else:
            content_bytes = new_content
            
        # Update the content in unstructured_file_storage
        c.execute("""
            UPDATE unstructured_file_storage
            SET content = ?
            WHERE file_id = ? AND unique_key = ?
        """, (content_bytes, file_id, unique_key))
        
        conn.commit()
        return jsonify({'message': 'Content updated successfully'}), 200
        
    except Exception as e:
        app.logger.error(f"Error saving unstructured content: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/get_table_count/<user_id>/<filename>', methods=['GET'])
def get_table_count(user_id, filename):
    try:
        conn = sqlite3.connect('user_files.db')
        c = conn.cursor()
        c.execute("SELECT content FROM user_files WHERE user_id = ? AND filename = ?", (user_id, filename))
        result = c.fetchone()
        conn.close()

        if result:
            content = result[0]
            with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as temp_db_file:
                temp_db_file.write(content)
                temp_db_path = temp_db_file.name

            conn = sqlite3.connect(temp_db_path)
            cursor = conn.cursor()

            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = [table[0] for table in cursor.fetchall()]
            conn.close()

            app.logger.info(f"Tables in {filename}: {tables}")
            return jsonify({"table_count": len(tables), "table_names": tables})
        else:
            app.logger.warning(f"File not found: {filename}")
            return "File not found", 404
    except Exception as e:
        app.logger.error(f"Error getting table count: {str(e)}")
        return str(e), 500

@app.route('/delete-file/<user_id>/<file_id>', methods=['DELETE'])
def delete_file(user_id, file_id):
    conn = sqlite3.connect('user_files.db')
    c = conn.cursor()
    try:
        # Verify file ownership and get metadata
        c.execute("""
            SELECT f.is_structured, f.unique_key, f.file_type, f.sheet_table, s.table_name
            FROM user_files f
            LEFT JOIN structured_file_storage s ON f.unique_key = s.unique_key
            WHERE f.file_id = ? AND f.user_id = ?
        """, (file_id, user_id))
        
        result = c.fetchone()
        if not result:
            return jsonify({'error': 'File not found or access denied'}), 404
            
        is_structured, unique_key, file_type, sheet_table, table_name = result
        
        if is_structured:
            if file_type in ['xlsx', 'xls'] and sheet_table:
                # For Excel files with multiple sheets
                c.execute("""
                    SELECT table_name FROM structured_file_storage
                    WHERE file_id = ?
                """, (file_id,))
                sheets = c.fetchall()
                
                # Drop all sheet tables
                for sheet in sheets:
                    sheet_table_name = sheet[0]
                    c.execute(f"DROP TABLE IF EXISTS '{sheet_table_name}'")
                
                # Delete all sheet records
                c.execute("""
                    DELETE FROM structured_file_storage
                    WHERE file_id = ?
                """, (file_id,))
                
            else:
                # For other structured files
                if table_name:
                    c.execute(f"DROP TABLE IF EXISTS '{table_name}'")
                c.execute("""
                    DELETE FROM structured_file_storage
                    WHERE unique_key = ?
                """, (unique_key,))
        else:
            # Delete from unstructured_file_storage
            c.execute("""
                DELETE FROM unstructured_file_storage
                WHERE file_id = ? AND unique_key = ?
            """, (file_id, unique_key))
        
        # Finally, delete from user_files
        c.execute("DELETE FROM user_files WHERE file_id = ?", (file_id,))
        
        conn.commit()
        return jsonify({'success': True, 'message': 'File deleted successfully'}), 200
        
    except Exception as e:
        conn.rollback()
        app.logger.error(f"Error deleting file: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
    
@app.route('/split-column/<user_id>/<file_id>', methods=['POST'])
def split_column(user_id, file_id):
    try:
        data = request.json
        column_name = data.get('column')
        delimiter = data.get('delimiter')
        new_column_prefix = data.get('newColumnPrefix', 'split')
        
        conn = sqlite3.connect('user_files.db')
        c = conn.cursor()
        
        # Get table info
        c.execute("""
            SELECT f.unique_key, s.table_name
            FROM user_files f
            LEFT JOIN structured_file_storage s ON f.unique_key = s.unique_key
            WHERE f.file_id = ? AND f.user_id = ?
        """, (file_id, user_id))
        
        result = c.fetchone()
        if not result:
            return jsonify({'error': 'File not found'}), 404
            
        unique_key, table_name = result
        
        # Read data into pandas
        df = pd.read_sql_query(f'SELECT * FROM "{table_name}"', conn)
        
        # Perform split operation efficiently
        split_df = df[column_name].str.split(delimiter, expand=True)
        
        # Name new columns
        num_cols = len(split_df.columns)
        new_columns = [f"{new_column_prefix}_{i+1}" for i in range(num_cols)]
        split_df.columns = new_columns
        
        # Add new columns to original dataframe
        for col in new_columns:
            df[col] = split_df[col]
        
        # Update database
        df.to_sql(table_name, conn, if_exists='replace', index=False)
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'newColumns': new_columns,
            'data': df.to_dict('records')
        })
        
    except Exception as e:
        app.logger.error(f"Error in split_column: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()



def calculate_basic_stats(df: pd.DataFrame) -> Dict[str, Any]:
    """Calculate basic statistics for the dataset."""
    numeric_cols = df.select_dtypes(include=['float64', 'int64']).columns
    
    return {
        'describe': df.describe().to_dict(),
        'missing_values': df.isnull().sum().to_dict(),
        'unique_counts': df.nunique().to_dict(),
        'numeric_summaries': {
            col: {
                'mean': df[col].mean(),
                'median': df[col].median(),
                'std': df[col].std(),
                'quartiles': df[col].quantile([0.25, 0.75]).to_dict()
            } for col in numeric_cols
        }
    }

def calculate_advanced_stats(df: pd.DataFrame) -> Dict[str, Any]:
    """Calculate advanced statistics for the dataset."""
    numeric_cols = df.select_dtypes(include=['float64', 'int64']).columns
    categorical_cols = df.select_dtypes(include=['object']).columns
    
    # Correlation matrix with p-values
    def correlation_with_pvalue(x: pd.Series, y: pd.Series):
        return stats.pearsonr(x.dropna(), y.dropna())
    
    correlation_matrix = {}
    for col1 in numeric_cols:
        correlation_matrix[col1] = {}
        for col2 in numeric_cols:
            if col1 != col2:
                corr, p_value = correlation_with_pvalue(df[col1], df[col2])
                correlation_matrix[col1][col2] = {'correlation': corr, 'p_value': p_value}
    
    # Calculate statistical tests and distributions
    distribution_tests = {}
    for col in numeric_cols:
        clean_data = df[col].dropna()
        distribution_tests[col] = {
            'normality': {
                'shapiro': stats.shapiro(clean_data[:5000]),  # Limit sample size for performance
                'skewness': stats.skew(clean_data),
                'kurtosis': stats.kurtosis(clean_data)
            },
            'outliers': identify_outliers(clean_data)
        }
    
    # Categorical analysis
    categorical_analysis = {}
    for col in categorical_cols:
        value_counts = df[col].value_counts()
        categorical_analysis[col] = {
            'frequencies': value_counts.to_dict(),
            'proportions': (value_counts / len(df)).to_dict(),
            'chi_square': calculate_chi_square(df, col) if len(value_counts) < 50 else None
        }
    
    return {
        'correlation_matrix': correlation_matrix,
        'distribution_tests': distribution_tests,
        'categorical_analysis': categorical_analysis,
        'summary_statistics': df.describe(include='all').to_dict()
    }

def identify_outliers(series: pd.Series) -> Dict[str, Any]:
    """Identify outliers using IQR method."""
    Q1 = series.quantile(0.25)
    Q3 = series.quantile(0.75)
    IQR = Q3 - Q1
    lower_bound = Q1 - 1.5 * IQR
    upper_bound = Q3 + 1.5 * IQR
    outliers = series[(series < lower_bound) | (series > upper_bound)]
    
    return {
        'count': len(outliers),
        'percentage': (len(outliers) / len(series)) * 100,
        'bounds': {'lower': lower_bound, 'upper': upper_bound},
        'outlier_values': outliers.head(10).to_dict()  # Return first 10 outliers
    }

def calculate_chi_square(df: pd.DataFrame, column: str) -> Dict[str, Any]:
    """Perform chi-square test of independence."""
    observed = df[column].value_counts()
    n = len(df)
    expected = pd.Series([n/len(observed)] * len(observed), index=observed.index)
    chi_square_stat, p_value = stats.chisquare(observed, expected)
    
    return {
        'statistic': chi_square_stat,
        'p_value': p_value,
        'dof': len(observed) - 1
    }

def generate_visualizations(df: pd.DataFrame) -> Dict[str, Any]:
    """Generate various visualizations for the dataset."""
    numeric_cols = df.select_dtypes(include=['float64', 'int64']).columns
    categorical_cols = df.select_dtypes(include=['object']).columns
    
    visualizations = {}
    
    # Distribution plots for numeric columns
    for col in numeric_cols[:5]:  # Limit to first 5 columns
        fig = px.histogram(df, x=col, marginal="box")
        visualizations[f'{col}_distribution'] = fig.to_json()
    
    # Correlation heatmap
    correlation = df[numeric_cols].corr()
    fig = go.Figure(data=go.Heatmap(
        z=correlation.values,
        x=correlation.columns,
        y=correlation.columns
    ))
    visualizations['correlation_heatmap'] = fig.to_json()
    
    # Bar plots for categorical columns
    for col in categorical_cols[:5]:
        fig = px.bar(df[col].value_counts().head(10))
        visualizations[f'{col}_distribution'] = fig.to_json()
    
    return visualizations
def convert_numpy_types(obj):
    """Convert numpy types to Python native types for JSON serialization."""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, pd.Series):
        return convert_numpy_types(obj.to_dict())
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    else:
        return obj

def prepare_response_data(data):
    """Prepare data for JSON response by converting numpy types."""
    return convert_numpy_types(data)

@app.route('/analyze/<user_id>/<file_id>', methods=['POST'])
def analyze_data(user_id: str, file_id: str):
    """Main analysis endpoint supporting different types of analysis."""
    try:
        data = request.json
        analysis_type = data.get('analysis_type')
        options = data.get('options', [])

        conn = sqlite3.connect('user_files.db')
        cursor = conn.cursor()

        # Get file metadata and table name
        cursor.execute("""
            SELECT f.unique_key, s.table_name
            FROM user_files f
            LEFT JOIN structured_file_storage s ON f.unique_key = s.unique_key
            WHERE f.file_id = ? AND f.user_id = ?
        """, (file_id, user_id))
        
        result = cursor.fetchone()
        if not result:
            return jsonify({'error': 'File not found'}), 404

        _, table_name = result

        # Read data in chunks if it's a large dataset
        chunk_size = 100000  # Adjust based on memory constraints

        chunks = []
        for chunk in pd.read_sql_query(f'SELECT * FROM "{table_name}"', conn, chunksize=chunk_size):
            chunks.append(chunk)
        df = pd.concat(chunks)

        response = {}
        
        if analysis_type == 'basic' or 'basic' in options:
            response['basic'] = prepare_response_data(calculate_basic_stats(df))
            
        if analysis_type == 'advanced' or 'advanced' in options:
            response['advanced'] = prepare_response_data(calculate_advanced_stats(df))
            
        if analysis_type == 'custom':
            custom_response = {}
            for option in options:
                if option in ['correlation', 'distributions', 'outliers']:
                    stats = calculate_advanced_stats(df)
                    custom_response[option] = stats.get(option)
                elif option == 'visualizations':
                    custom_response['visualizations'] = generate_visualizations(df)
            response = prepare_response_data(custom_response)
        
        # Add metadata about the analysis
        response['metadata'] = prepare_response_data({
            'rows': len(df),
            'columns': len(df.columns),
            'memory_usage': int(df.memory_usage(deep=True).sum()),
            'timestamp': pd.Timestamp.now().isoformat()
        })

        return jsonify(response)

    except Exception as e:
        app.logger.error(f"Error in analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

            
@app.route('/update_blob/<user_id>/<filename>', methods=['POST'])
def update_blob(user_id, filename):
    app.logger.info(f"Received update blob request for user: {user_id}, file: {filename}")
    
    try:
        data = request.json
        new_content = data.get('newContent', [])
        
        if not new_content:
            return jsonify({"error": "No content to update"}), 400
        
        app.logger.info(f"Received new content: {new_content[:5]}...")  # Log first 5 items
        
        # Convert the new content to a pandas DataFrame
        df = pd.DataFrame(new_content)
        
        # Determine file type and save accordingly
        file_extension = filename.split('.')[-1].lower()
        
        if file_extension == 'xlsx':
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, index=False)
            content = output.getvalue()
        elif file_extension in ['csv', 'tsv', 'txt']:
            delimiter = ',' if file_extension == 'csv' else '\t'
            csv_buffer = io.StringIO()
            df.to_csv(csv_buffer, index=False, sep=delimiter)
            content = csv_buffer.getvalue().encode()
        elif file_extension == 'db':
            temp_db = io.BytesIO()
            conn = sqlite3.connect(temp_db)
            df.to_sql('data', conn, if_exists='replace', index=False)
            conn.commit()
            content = temp_db.getvalue()
        elif file_extension == 'xml':
            root = ET.Element('root')
            for _, row in df.iterrows():
                child = ET.SubElement(root, 'item')
                for col, value in row.items():
                    child.set(col, str(value))
            content = ET.tostring(root)
        elif file_extension == 'pdf':
            # We can't easily update PDF content, so we'll create a new PDF with the data
            output = io.BytesIO()
            pdf = PyPDF2.PdfWriter()
            page = pdf.add_blank_page(width=612, height=792)
            page.insert_text(50, 700, str(df))
            pdf.write(output)
            content = output.getvalue()
        else:
            return jsonify({"error": "Unsupported file type for update"}), 400
        
        conn = sqlite3.connect('user_files.db')
        c = conn.cursor()
        
        # Update the database with the new content
        c.execute("UPDATE user_files SET content = ? WHERE user_id = ? AND filename = ?",
                  (content, user_id, filename))
        conn.commit()
        conn.close()
        
        app.logger.info(f"Successfully updated the blob content for file '{filename}' for user '{user_id}'")
        return jsonify({"message": "Successfully updated the blob content"}), 200
    
    except Exception as e:
        app.logger.error(f"Error updating blob content: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Add these new endpoints to your backend.py

@app.route('/get-column-stats/<user_id>/<file_id>/<column_name>', methods=['GET'])
def get_column_stats(user_id, file_id, column_name):
    """Get statistics and metadata for a specific column."""
    try:
        conn = sqlite3.connect('user_files.db')
        c = conn.cursor()
        
        # Get table name from file metadata
        c.execute("""
            SELECT unique_key
            FROM user_files
            WHERE file_id = ? AND user_id = ?
        """, (file_id, user_id))
        
        result = c.fetchone()
        if not result:
            return jsonify({'error': 'File not found'}), 404
            
        table_name = f"table_{result[0]}"
        
        # Read column data
        df = pd.read_sql_query(f'SELECT "{column_name}" FROM "{table_name}"', conn)
        
        # Determine column type
        sample = df[column_name].dropna().iloc[0] if not df[column_name].empty else None
        is_numeric = pd.api.types.is_numeric_dtype(df[column_name])
        
        if is_numeric:
            stats = {
                'type': 'numeric',
                'min': float(df[column_name].min()),
                'max': float(df[column_name].max()),
                'mean': float(df[column_name].mean()),
                'median': float(df[column_name].median()),
                'unique_count': int(df[column_name].nunique()),
                'null_count': int(df[column_name].isnull().sum()),
                'value_counts': df[column_name].value_counts().head(10).to_dict()
            }
        else:
            value_counts = df[column_name].value_counts()
            stats = {
                'type': 'categorical',
                'unique_values': df[column_name].unique().tolist(),
                'unique_count': int(df[column_name].nunique()),
                'null_count': int(df[column_name].isnull().sum()),
                'value_counts': value_counts.head(50).to_dict()
            }
            
        return jsonify(stats)
        
    except Exception as e:
        app.logger.error(f"Error getting column stats: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/apply-filters/<user_id>/<file_id>', methods=['POST'])
def apply_filters(user_id, file_id):
    """Apply filters and sorting to the dataset."""
    try:
        filters = request.json.get('filters', [])
        sort_by = request.json.get('sort_by', {})
        page = request.json.get('page', 1)
        page_size = request.json.get('page_size', 50)
        
        conn = sqlite3.connect('user_files.db')
        c = conn.cursor()
        
        # Get table name
        c.execute("""
            SELECT unique_key
            FROM user_files
            WHERE file_id = ? AND user_id = ?
        """, (file_id, user_id))
        
        result = c.fetchone()
        if not result:
            return jsonify({'error': 'File not found'}), 404
            
        table_name = f"table_{result[0]}"
        
        # Build SQL query with filters
        query = f'SELECT * FROM "{table_name}"'
        params = []
        
        if filters:
            conditions = []
            for f in filters:
                column = f['column']
                operator = f['operator']
                value = f['value']
                
                if operator == 'between':
                    conditions.append(f'"{column}" BETWEEN ? AND ?')
                    params.extend([value[0], value[1]])
                elif operator in ['=', '>', '<', '>=', '<=']:
                    conditions.append(f'"{column}" {operator} ?')
                    params.append(value)
                elif operator == 'in':
                    placeholders = ','.join(['?' for _ in value])
                    conditions.append(f'"{column}" IN ({placeholders})')
                    params.extend(value)
                elif operator == 'like':
                    conditions.append(f'"{column}" LIKE ?')
                    params.append(f'%{value}%')
                    
            if conditions:
                query += ' WHERE ' + ' AND '.join(conditions)
        
        # Add sorting
        if sort_by:
            query += f' ORDER BY "{sort_by["column"]}" {sort_by["direction"]}'
            
        # Add pagination
        query += ' LIMIT ? OFFSET ?'
        params.extend([page_size, (page - 1) * page_size])
        
        # Execute query
        df = pd.read_sql_query(query, conn, params=params)
        
        # Get total count for pagination
        count_query = f'SELECT COUNT(*) FROM "{table_name}"'
        if filters:
            count_query += ' WHERE ' + ' AND '.join(conditions)
        total_count = pd.read_sql_query(count_query, conn, params=params[:-2]).iloc[0, 0]
        
        return jsonify({
            'data': df.to_dict('records'),
            'total': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size
        })
        
    except Exception as e:
        app.logger.error(f"Error applying filters: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
        
# @app.route('/generate-graph/<user_id>/<file_id>', methods=['POST'])
# def generate_graph(user_id, file_id):
#     try:
#         app.logger.debug(f"Received request: user_id={user_id}, file_id={file_id}")
#         data = request.json
#         app.logger.debug(f"Request data: {data}")

#         # Convert file_id to string if needed
#         file_id = str(file_id)
        
#         conn = sqlite3.connect('user_files.db')
#         c = conn.cursor()
        
#         # First, check if this is a parent file
#         c.execute("""
#             SELECT file_type
#             FROM user_files
#             WHERE file_id = ? AND user_id = ?
#         """, (file_id, user_id))
        
#         file_info = c.fetchone()
#         if not file_info:
#             return jsonify({'error': 'File not found'}), 404
            
#         file_type = file_info[0]
        
#         # Get the actual table data based on file type
#         if file_type in ['xlsx', 'xls', 'db']:
#             # For Excel and DB files, get child file metadata
#             c.execute("""
#                 SELECT f.file_id, f.unique_key, f.sheet_table
#                 FROM user_files f
#                 WHERE f.parent_file_id = ? AND f.user_id = ?
#             """, (file_id, user_id))
            
#             children = c.fetchall()
#             if children:
#                 # Use the first child's data
#                 child_id, unique_key, sheet_table = children[0]
#                 table_name = f"table_{unique_key}"
#             else:
#                 # If no children, try to get the file's own table
#                 c.execute("""
#                     SELECT f.unique_key
#                     FROM user_files f
#                     WHERE f.file_id = ? AND f.user_id = ?
#                 """, (file_id, user_id))
#                 result = c.fetchone()
#                 if result:
#                     unique_key = result[0]
#                     table_name = f"table_{unique_key}"
#                 else:
#                     return jsonify({'error': 'No data table found'}), 400
#         else:
#             # For other structured files (CSV, etc.)
#             c.execute("""
#                 SELECT f.unique_key
#                 FROM user_files f
#                 WHERE f.file_id = ? AND f.user_id = ?
#             """, (file_id, user_id))
#             result = c.fetchone()
#             if result:
#                 unique_key = result[0]
#                 table_name = f"table_{unique_key}"
#             else:
#                 return jsonify({'error': 'No data table found'}), 400

#         # Verify table exists
#         c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
#         if not c.fetchone():
#             return jsonify({'error': f'Table {table_name} not found'}), 404

#         # Get data from the table
#         query = f'SELECT * FROM "{table_name}"'
#         app.logger.debug(f"SQL Query: {query}")
#         df = pd.read_sql_query(query, conn)
#         app.logger.debug(f"DataFrame shape: {df.shape}")
#         data = request.json
#         chart_type = data.get('chartType')
#         selected_columns = data.get('selectedColumns')
#         options = data.get('options', {})
#         chart_type = data.get('chartType')
#         selected_columns = data.get('selectedColumns', [])
#         app.logger.debug(f"Chart type: {chart_type}, Selected columns: {selected_columns}")
        
#         # Create figure based on chart type
#         try:
#             if chart_type == 'line':
#                 fig = px.line(df, x=selected_columns[0], y=selected_columns[1:])
#             elif chart_type == 'bar':
#                 fig = px.bar(df, x=selected_columns[0], y=selected_columns[1:])
#             elif chart_type == 'pie':
#                 fig = px.pie(df, values=selected_columns[1], names=selected_columns[0])
#             elif chart_type == 'scatter':
#                 fig = px.scatter(df, x=selected_columns[0], y=selected_columns[1])
#             elif chart_type == 'box':
#                 fig = px.box(df, y=selected_columns[1:])
#             elif chart_type == 'histogram':
#                    fig = px.histogram(df, x=selected_columns[0], nbins=options.get('binSize', 10))
#             elif chart_type == 'segmented-bar':
#                    fig = px.bar(df, x=selected_columns[0], y=selected_columns[1:],barmode=options.get('stackType', 'stack'))            
#             else:
#                 return jsonify({'error': f'Unsupported chart type: {chart_type}'}), 400
                
#             # Update layout for better appearance
#             fig.update_layout(
#                 template='plotly_white',
#                 margin=dict(l=40, r=40, t=40, b=40),
#                 height=400
#             )
            
#             # Generate HTML
#             html = fig.to_html(full_html=False, include_plotlyjs='cdn')
            
#             # Save to graph cache
#             graph_id = str(uuid.uuid4())
#             c.execute("""
#                 INSERT INTO graph_cache (graph_id, html_content, created_at)
#                 VALUES (?, ?, CURRENT_TIMESTAMP)
#             """, (graph_id, html))
            
#             conn.commit()
#             return jsonify({
#                 'graph_id': graph_id,
#                 'url': f'/graph/{graph_id}'
#             })
            
#         except Exception as e:
#             app.logger.error(f"Error creating plot: {str(e)}")
#             return jsonify({'error': f'Error creating plot: {str(e)}'}), 500
            
#     except Exception as e:
#         app.logger.error(f"Error generating graph: {str(e)}")
#         app.logger.error(traceback.format_exc())
#         return jsonify({'error': str(e)}), 500
#     finally:
#         if 'conn' in locals():
#             conn.close()

# @app.route('/graph/<graph_id>', methods=['GET'])
# def serve_graph(graph_id):
#     try:
#         conn = sqlite3.connect('user_files.db')
#         c = conn.cursor()
        
#         c.execute("""
#             SELECT html_content
#             FROM graph_cache
#             WHERE graph_id = ?
#         """, (graph_id,))
        
#         result = c.fetchone()
#         if not result:
#             return 'Graph not found', 404
            
#         html_content = result[0]
        
#         # Create a full HTML page with necessary styling
#         full_html = f"""
#         <!DOCTYPE html>
#         <html>
#         <head>
#             <meta charset="utf-8">
#             <style>
#                 body {{ margin: 0; padding: 0; overflow: hidden; }}
#                 #graph {{ width: 100%; height: 100vh; }}
#             </style>
#         </head>
#         <body>
#             <div id="graph">
#                 {html_content}
#             </div>
#         </body>
#         </html>
#         """
        
#         return Response(full_html, mimetype='text/html')
        
#     except Exception as e:
#         app.logger.error(f"Error serving graph: {str(e)}")
#         return str(e), 500
#     finally:
#         conn.close()

@app.route('/generate-graph/<user_id>/<file_id>', methods=['POST'])
def generate_graph(user_id, file_id):
    """
    Enhanced route handler for generating interactive charts.
    Supports an expanded set of chart types with improved data processing.
    """
    try:
        app.logger.debug(f"Received request: user_id={user_id}, file_id={file_id}")
        data = request.json
        
        # Get chart parameters
        chart_type = data.get('chartType')
        selected_columns = data.get('selectedColumns', [])
        options = data.get('options', {})
        
        # Validate input
        if not chart_type or not selected_columns:
            return jsonify({'error': 'Missing required parameters'}), 400

        # Special handling for different chart types
        required_columns = {
            'kline': 5,  # date, open, close, low, high
            'surface3d': 3,
            'bar3d': 3,
            'line3d': 3,
            'scatter3d': 3,
            'sankey': 2,
            'graph': 2
        }

        if chart_type in required_columns and len(selected_columns) < required_columns[chart_type]:
            return jsonify({
                'error': f'{chart_type} requires at least {required_columns[chart_type]} columns'
            }), 400

        # Database connection
        conn = sqlite3.connect('user_files.db')
        c = conn.cursor()
        
        try:
            # Get file information
            c.execute("""
                SELECT file_type, unique_key
                FROM user_files
                WHERE file_id = ? AND user_id = ?
            """, (file_id, user_id))
            
            file_info = c.fetchone()
            if not file_info:
                return jsonify({'error': 'File not found'}), 404
                
            file_type, unique_key = file_info
            table_name = f"table_{unique_key}"

            # Verify table exists
            c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
            if not c.fetchone():
                return jsonify({'error': f'Table {table_name} not found'}), 404

            # Get data using optimized function with specific handling for each chart type
            df = get_table_data(table_name, selected_columns)
            
            # Special data processing for specific chart types
            if chart_type == 'kline':
                # Ensure data is sorted by date
                df = df.sort_values(by=selected_columns[0])
            elif chart_type in ['surface3d', 'bar3d', 'line3d', 'scatter3d']:
                # Normalize 3D data
                for col in selected_columns[1:]:
                    df[col] = (df[col] - df[col].min()) / (df[col].max() - df[col].min())
            elif chart_type == 'gauge':
                # Ensure single value for gauge
                if len(df) > 1:
                    df = df.iloc[[0]]
            elif chart_type == 'liquid':
                # Convert to percentage if needed
                if df[selected_columns[0]].max() > 1:
                    df[selected_columns[0]] = df[selected_columns[0]] / 100

            # Generate chart
            chart = EnhancedChartGenerator.create_chart(chart_type, df, selected_columns, options)
            
            # Generate HTML and cache it
            graph_id = str(uuid.uuid4())
            html_content = chart.render_embed()
            
            c.execute("""
                INSERT INTO graph_cache (graph_id, html_content, created_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
            """, (graph_id, html_content))
            
            conn.commit()
            
            return jsonify({
                'graph_id': graph_id,
                'url': f'/graph/{graph_id}'
            })
            
        finally:
            conn.close()
            
    except Exception as e:
        app.logger.error(f"Error generating graph: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/graph/<graph_id>', methods=['GET'])
def serve_graph(graph_id):
    """
    Enhanced route handler for serving cached graphs with improved responsive layout
    and interaction features.
    """
    try:
        conn = sqlite3.connect('user_files.db')
        c = conn.cursor()
        
        c.execute("""
            SELECT html_content
            FROM graph_cache
            WHERE graph_id = ?
        """, (graph_id,))
        
        result = c.fetchone()
        if not result:
            return 'Graph not found', 404
            
        html_content = result[0]
        
        # Create a full HTML page with enhanced responsive layout
        full_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                html, body {{
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                }}
                
                #chart-container {{
                    width: 100%;
                    height: 100%;
                    position: relative;
                }}
                
                .echarts-container {{
                    width: 100% !important;
                    height: 100% !important;
                }}
                
                /* Dark mode support */
                @media (prefers-color-scheme: dark) {{
                    body {{
                        background-color: #1a1a1a;
                    }}
                    
                    .echarts-for-react {{
                        background-color: #1a1a1a;
                    }}
                }}
                
                /* Enhanced tooltip styles */
                .echarts-tooltip {{
                    background: rgba(255, 255, 255, 0.9) !important;
                    backdrop-filter: blur(4px);
                    border-radius: 4px;
                    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
                    padding: 8px 12px;
                }}
                
                /* Responsive adjustments */
                @media (max-width: 768px) {{
                    .echarts-tooltip {{
                        max-width: 200px;
                    }}
                }}
            </style>
        </head>
        <body>
            <div id="chart-container">
                {html_content}
            </div>
            
            <script>
                document.addEventListener('DOMContentLoaded', function() {{
                    // Get the chart instance
                    const chartInstance = echarts.getInstanceByDom(
                        document.querySelector('#chart-container div')
                    );
                    
                    if (chartInstance) {{
                        // Store reference for resize handling
                        window.chart = chartInstance;
                        
                        // Enhanced resize handling with debouncing
                        let resizeTimeout;
                        const handleResize = () => {{
                            clearTimeout(resizeTimeout);
                            resizeTimeout = setTimeout(() => {{
                                if (window.chart) {{
                                    window.chart.resize({{
                                        animation: {{
                                            duration: 300,
                                            easing: 'cubicInOut'
                                        }}
                                    }});
                                }}
                            }}, 100);
                        }};
                        
                        // Set up resize observer with enhanced options
                        const resizeObserver = new ResizeObserver(entries => {{
                            for (let entry of entries) {{
                                handleResize();
                            }}
                        }});
                        
                        // Observe the container
                        resizeObserver.observe(document.getElementById('chart-container'));
                        
                        // Also handle window resize events
                        window.addEventListener('resize', handleResize);
                        
                        // Handle visibility changes
                        document.addEventListener('visibilitychange', () => {{
                            if (document.visibilityState === 'visible') {{
                                handleResize();
                            }}
                        }});
                    }}
                }});
            </script>
        </body>
        </html>
        """
        
        return Response(full_html, mimetype='text/html')        
    except Exception as e:
        app.logger.error(f"Error serving graph: {str(e)}")
        return str(e), 500
    finally:
        if conn:
            conn.close()


if __name__ == '__main__':
    app.run(debug=True, port=5000)