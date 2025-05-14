def create_dashboard_export_template(c, page_width, page_height, dashboard_name, export_id, company_name=None):
    """
    Apply a professional template to a dashboard export PDF page.
    
    Args:
        c: ReportLab canvas object
        page_width: Width of the page
        page_height: Height of the page
        dashboard_name: Name of the dashboard
        export_id: Export identifier
        company_name: Optional company name
    
    Returns:
        tuple: (content_x, content_y, content_width, content_height) - The content area coordinates
    """
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    import datetime
    
    # Register fonts if not already registered
    try:
        pdfmetrics.registerFont(TTFont('Montserrat-Regular', 'static/fonts/Montserrat-Regular.ttf'))
        pdfmetrics.registerFont(TTFont('Montserrat-Bold', 'static/fonts/Montserrat-Bold.ttf'))
        pdfmetrics.registerFont(TTFont('Montserrat-Light', 'static/fonts/Montserrat-Light.ttf'))
    except:
        # Fallback to standard fonts if custom fonts aren't available
        pass
    
    # Define color scheme
    colors = {
        'primary': (0.15, 0.35, 0.6),      # Deep blue
        'secondary': (0.2, 0.55, 0.85),    # Lighter blue
        'accent': (0.0, 0.65, 0.65),       # Teal
        'background': (0.98, 0.98, 0.98),  # Off-white
        'text_dark': (0.2, 0.2, 0.25),     # Dark gray
        'text_medium': (0.4, 0.4, 0.45),   # Medium gray
        'text_light': (0.6, 0.6, 0.65),    # Light gray
        'white': (1, 1, 1),                # White
        'border': (0.85, 0.85, 0.9),       # Light border
        'chart': (0.2, 0.5, 0.8),          # Chart blue
        'table': (0.3, 0.6, 0.4),          # Table green
        'stat': (0.8, 0.4, 0.2),           # Stat orange
        'text': (0.5, 0.3, 0.7)            # Text purple
    }
    
    # Set margins
    margin = 15 * mm
    header_height = 32 * mm
    footer_height = 15 * mm
    
    # Calculate content area
    content_x = margin
    content_y = margin + footer_height
    content_width = page_width - (2 * margin)
    content_height = page_height - margin - header_height - footer_height
    
    # Save state to restore later
    c.saveState()
    
    # Draw page background (very subtle)
    c.setFillColorRGB(*colors['background'])
    c.rect(0, 0, page_width, page_height, fill=1, stroke=0)
    
    # ===== HEADER =====
    # Header background
    c.setFillColorRGB(*colors['white'])
    c.rect(0, page_height - header_height, page_width, header_height, fill=1, stroke=0)
    
    # Header accent bar
    c.setFillColorRGB(*colors['primary'])
    c.rect(0, page_height - 4*mm, page_width, 4*mm, fill=1, stroke=0)
    
    # Secondary accent line
    c.setFillColorRGB(*colors['secondary'])
    c.rect(0, page_height - header_height, page_width, 1*mm, fill=1, stroke=0)
    
    # Dashboard title
    title_font = 'Montserrat-Bold' if 'Montserrat-Bold' in pdfmetrics.getRegisteredFontNames() else 'Helvetica-Bold'
    c.setFont(title_font, 18)
    c.setFillColorRGB(*colors['text_dark'])
    c.drawString(margin, page_height - 20*mm, dashboard_name)
    
    # Timestamp
    timestamp = datetime.datetime.now().strftime('%B %d, %Y at %H:%M')
    info_font = 'Montserrat-Light' if 'Montserrat-Light' in pdfmetrics.getRegisteredFontNames() else 'Helvetica'
    c.setFont(info_font, 9)
    c.setFillColorRGB(*colors['text_medium'])
    c.drawString(margin, page_height - 26*mm, f"Generated: {timestamp}")
    
    # Company logo placeholder (right side of header)
    if company_name:
        # If we have a company name but no logo, display the name
        c.setFont(title_font, 14)
        c.setFillColorRGB(*colors['primary'])
        c.drawRightString(page_width - margin, page_height - 20*mm, company_name)
    
    # ===== CONTENT AREA =====
    # Content area background
    c.setFillColorRGB(*colors['white'])
    c.rect(content_x, content_y, content_width, content_height, fill=1, stroke=0)
    
    # Content area border
    c.setStrokeColorRGB(*colors['border'])
    c.setLineWidth(0.75)
    c.rect(content_x, content_y, content_width, content_height, fill=0, stroke=1)
    
    # ===== FOOTER =====
    # Footer background
    c.setFillColorRGB(*colors['white'])
    c.rect(0, 0, page_width, footer_height, fill=1, stroke=0)
    
    # Footer accent line
    c.setFillColorRGB(*colors['secondary'])
    c.rect(0, footer_height, page_width, 1*mm, fill=1, stroke=0)
    
    # Page info
    c.setFont(info_font, 9)
    c.setFillColorRGB(*colors['text_medium'])
    
    # Left side - Company/export info
    current_year = datetime.datetime.now().year
    company_text = f"© {current_year} {company_name}" if company_name else f"Dashboard Export {current_year}"
    c.drawString(margin, footer_height/2 - 1.5*mm, company_text)
    
    # Center - Page numbers (will be added later when we know total pages)
    # This is just a placeholder
    c.setFillColorRGB(*colors['text_medium'])
    c.drawCentredString(page_width/2, footer_height/2 - 1.5*mm, "Page X of Y")
    
    # Right side - Export ID
    c.setFillColorRGB(*colors['text_light'])
    c.drawRightString(page_width - margin, footer_height/2 - 1.5*mm, f"Export ID: {export_id[:8]}")
    
    # Restore state
    c.restoreState()
    
    return (content_x, content_y, content_width, content_height)


def draw_element_card(c, x, y, width, height, title=None, element_type='chart', colors=None):
    """
    Draw a card for a dashboard element with proper styling.
    
    Args:
        c: ReportLab canvas object
        x, y: Bottom-left coordinates of the card
        width, height: Dimensions of the card
        title: Optional title for the card
        element_type: Type of element ('chart', 'table', 'stat', 'text')
        colors: Optional color dictionary
    
    Returns:
        tuple: (content_x, content_y, content_width, content_height) - The content area coordinates
    """
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    
    # Default colors if not provided
    if not colors:
        colors = {
            'chart': (0.2, 0.5, 0.8),    # Blue for charts
            'table': (0.3, 0.6, 0.4),    # Green for tables
            'stat': (0.8, 0.4, 0.2),     # Orange for stats
            'text': (0.5, 0.3, 0.7),     # Purple for text
            'white': (1, 1, 1),          # White
            'border': (0.85, 0.85, 0.9), # Light border
            'shadow': (0.9, 0.9, 0.9)    # Shadow color
        }
    
    # Get element color
    element_color = colors.get(element_type, colors['chart'])
    
    # Save state
    c.saveState()
    
    # Draw shadow
    shadow_offset = 1.5*mm
    c.setFillColorRGB(*colors['shadow'])
    c.rect(x + shadow_offset, y - shadow_offset, width, height, fill=1, stroke=0)
    
    # Draw card background
    c.setFillColorRGB(*colors['white'])
    c.rect(x, y, width, height, fill=1, stroke=0)
    
    # Draw card border
    c.setStrokeColorRGB(*colors['border'])
    c.setLineWidth(0.5)
    c.rect(x, y, width, height, fill=0, stroke=1)
    
    # Calculate content area with padding
    padding = 3*mm
    content_x = x + padding
    content_y = y + padding
    content_width = width - 2*padding
    content_height = height - 2*padding
    
    # Add title if provided
    if title:
        title_height = 8*mm
        
        # Title background
        c.setFillColorRGB(*element_color)
        c.rect(x, y + height, width, title_height, fill=1, stroke=0)
        
        # Title text
        title_font = 'Montserrat-Bold' if 'Montserrat-Bold' in pdfmetrics.getRegisteredFontNames() else 'Helvetica-Bold'
        c.setFont(title_font, 10)
        c.setFillColorRGB(*colors['white'])
        
        # Truncate title if too long
        text_width = c.stringWidth(title, title_font, 10)
        if text_width > width - 10*mm:
            while text_width > width - 10*mm and len(title) > 3:
                title = title[:-1]
                text_width = c.stringWidth(title + "...", title_font, 10)
            title = title + "..."
        
        # Center the title
        text_x = x + (width - c.stringWidth(title, title_font, 10)) / 2
        text_y = y + height + (title_height / 2) - 1.5*mm
        c.drawString(text_x, text_y, title)
    
    # Restore state
    c.restoreState()
    
    return (content_x, content_y, content_width, content_height)


def apply_dashboard_template(c, page_width, page_height, dashboard_name, export_id, elements, company_name=None):
    """
    Apply the dashboard template and layout all elements on the page.
    
    Args:
        c: ReportLab canvas object
        page_width, page_height: Page dimensions
        dashboard_name: Name of the dashboard
        export_id: Export identifier
        elements: List of element dictionaries with:
                  - type: 'chart', 'table', 'stat', or 'text'
                  - title: Element title
                  - image_path: Path to the element image
                  - position: Dictionary with x, y, width, height
        company_name: Optional company name
    """
    from reportlab.lib.units import mm
    
    # Apply the base template
    content_x, content_y, content_width, content_height = create_dashboard_export_template(
        c, page_width, page_height, dashboard_name, export_id, company_name
    )
    
    # Skip if no elements
    if not elements:
        c.setFont('Helvetica', 12)
        c.setFillColorRGB(0.5, 0.5, 0.5)
        c.drawCentredString(
            content_x + content_width/2,
            content_y + content_height/2,
            "No dashboard elements to display"
        )
        return
    
    # Find the bounding box of all elements
    min_x = min(el['position'].get('x', 0) or 0 for el in elements)
    min_y = min(el['position'].get('y', 0) or 0 for el in elements)
    max_x = max((el['position'].get('x', 0) or 0) + (el['position'].get('width', 400) or 400) for el in elements)
    max_y = max((el['position'].get('y', 0) or 0) + (el['position'].get('height', 300) or 300) for el in elements)
    
    # Calculate scale to fit all elements
    width_scale = content_width / (max_x - min_x) if max_x > min_x else 1
    height_scale = content_height / (max_y - min_y) if max_y > min_y else 1
    scale = min(width_scale, height_scale) * 0.95  # 95% to leave some margin
    
    # Function to transform coordinates
    def transform_coords(pos):
        x = ((pos.get('x', 0) or 0) - min_x) * scale + content_x
        y = content_y + content_height - (((pos.get('y', 0) or 0) - min_y) * scale) - (pos.get('height', 300) or 300) * scale
        width = (pos.get('width', 400) or 400) * scale
        height = (pos.get('height', 300) or 300) * scale
        return x, y, width, height
    
    # Draw each element
    for element in elements:
        element_type = element.get('type', 'chart')
        title = element.get('title', '')
        image_path = element.get('image_path', '')
        
        # Skip if no image
        if not image_path:
            continue
        
        # Transform coordinates
        x, y, width, height = transform_coords(element['position'])
        
        # Draw the element card
        content_x, content_y, content_width, content_height = draw_element_card(
            c, x, y, width, height, title, element_type
        )
        
        # Draw the element image
        try:
            c.drawImage(
                image_path, 
                content_x, 
                content_y, 
                width=content_width, 
                height=content_height, 
                preserveAspectRatio=True
            )
        except Exception as e:
            # If image fails, draw a placeholder
            c.setFillColorRGB(0.95, 0.95, 0.95)
            c.rect(content_x, content_y, content_width, content_height, fill=1, stroke=0)
            c.setFont('Helvetica', 10)
            c.setFillColorRGB(0.5, 0.5, 0.5)
            c.drawCentredString(
                content_x + content_width/2,
                content_y + content_height/2,
                "Image not available"
            )


def create_multi_page_dashboard_export(output_path, dashboards, export_id, company_name=None):
    """
    Create a multi-page dashboard export PDF.
    
    Args:
        output_path: Path to save the PDF
        dashboards: List of dashboard dictionaries with:
                    - name: Dashboard name
                    - elements: List of element dictionaries
        export_id: Export identifier
        company_name: Optional company name
    """
    from reportlab.lib.pagesizes import landscape, A4
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import mm  # Import mm here
    import datetime
    
    # Create PDF canvas
    c = canvas.Canvas(output_path, pagesize=landscape(A4))
    c.setTitle(f"Dashboard Export - {datetime.datetime.now().strftime('%Y-%m-%d')}")
    page_width, page_height = landscape(A4)
    
    # Process each dashboard
    total_pages = len(dashboards)
    for i, dashboard in enumerate(dashboards):
        # Apply template and draw elements
        apply_dashboard_template(
            c, 
            page_width, 
            page_height, 
            dashboard['name'], 
            export_id, 
            dashboard['elements'], 
            company_name
        )
        
        # Add page number to the footer
        c.setFont('Helvetica', 9)
        c.setFillColorRGB(0.5, 0.5, 0.5)
        c.drawCentredString(
            page_width / 2, 
            7.5 * mm,  # Use mm here
            f"Page {i + 1} of {total_pages}"
        )
        
        # Start a new page for the next dashboard, except the last one
        if i < total_pages - 1:
            c.showPage()
    
    # Save the PDF
    c.save()
    
    return output_path
    
# # Example usage
# if __name__ == "__main__":
#     # This is just an example of how to use the template
#     dashboards = [
#         {
#             'name': 'Sales Dashboard',
#             'elements': [
#                 {
#                     'type': 'chart',
#                     'title': 'Monthly Revenue',
#                     'image_path': 'chart_image_1.png',
#                     'position': {'x': 0, 'y': 0, 'width': 500, 'height': 300}
#                 },
#                 {
#                     'type': 'table',
#                     'title': 'Top Products',
#                     'image_path': 'table_image_1.png',
#                     'position': {'x': 520, 'y': 0, 'width': 500, 'height': 300}
#                 },
#                 {
#                     'type': 'stat',
#                     'title': 'Total Revenue',
#                     'image_path': 'stat_image_1.png',
#                     'position': {'x': 0, 'y': 320, 'width': 250, 'height': 150}
#                 }
#             ]
#         },
#         {
#             'name': 'Marketing Dashboard',
#             'elements': [
#                 {
#                     'type': 'chart',
#                     'title': 'Campaign Performance',
#                     'image_path': 'chart_image_2.png',
#                     'position': {'x': 0, 'y': 0, 'width': 600, 'height': 400}
#                 }
#             ]
#         }
#     ]
    
#     create_multi_page_dashboard_export(
#         'dashboard_export.pdf',
#         dashboards,
#         'export-123456',
#         'Acme Corporation'
#     )