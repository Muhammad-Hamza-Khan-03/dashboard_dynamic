import plotly.io as pio

def get_data_from_html(json_file):
    """
    Extracts data from a Plotly HTML file and returns the data and axis labels.
    
    Parameters:
    json_file (str): Path to the HTML file containing the Plotly chart.
    
    Returns:
    tuple: A tuple containing the data and axis labels.
    """

    fig = pio.read_json(json_file)
    
    # Extracting data
    data = fig['data']
    
    # Extracting axis labels
    xaxis_label = fig['layout']['xaxis']['title']['text']
    yaxis_label = fig['layout']['yaxis']['title']['text']
    
    return data, (xaxis_label, yaxis_label)

data , (x_axis,y_axis) = get_data_from_html('visualization/top_10_locations_vehicle_types.html')

print("Data:", data)
print("X-axis label:", x_axis)
print("Y-axis label:", y_axis)
