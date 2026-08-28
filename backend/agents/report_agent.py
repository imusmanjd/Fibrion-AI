from datetime import datetime,timezone
from html import escape
from pathlib import Path
from typing import Any

import pandas as pd
from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle,Image,KeepTogether,KeepInFrame,PageBreak,Flowable

from core.logging_config import get_agent_logger,run_id_ctx
from core.schema_registry.base import get_process_module
from orchestration.state import FibrionState

logger=get_agent_logger("report")

# ---------- DESIGN ----------
NAVY=colors.HexColor("#172A46"); NAVY2=colors.HexColor("#2A456D")
BLUE=colors.HexColor("#4475AD"); AMBER=colors.HexColor("#D2A04A")
GREEN=colors.HexColor("#3E7D52"); RED=colors.HexColor("#B84C4C")
ORANGE=colors.HexColor("#C27B2D"); INK=colors.HexColor("#202A38")
MUTED=colors.HexColor("#687486"); BG=colors.HexColor("#F4F6F9")
WHITE=colors.white; LINE=colors.HexColor("#D8DEE7")
PALE_BLUE=colors.HexColor("#EDF3FA"); PALE_GREEN=colors.HexColor("#ECF5EE")
PALE_RED=colors.HexColor("#FBECEC"); PALE_AMBER=colors.HexColor("#FFF5E4")

PW,PH=A4
L=R=15*mm
T,B=15*mm,16*mm
CW=PW-L-R
G=5*mm

# ---------- FONT ----------
FONT,BOLD="Helvetica","Helvetica-Bold"
for regular,bold in [
    (r"C:\Windows\Fonts\segoeui.ttf",r"C:\Windows\Fonts\segoeuib.ttf"),
    ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf","/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
]:
    if Path(regular).exists() and Path(bold).exists():
        try:
            pdfmetrics.registerFont(TTFont("Fibrion",regular))
            pdfmetrics.registerFont(TTFont("Fibrion-Bold",bold))
            FONT,BOLD="Fibrion","Fibrion-Bold"
            break
        except Exception:
            pass

# ---------- STYLES ----------
ST={
    "body":ParagraphStyle("body",fontName=FONT,fontSize=9.5,leading=13.6,textColor=INK),
    "small":ParagraphStyle("small",fontName=FONT,fontSize=8.1,leading=11.2,textColor=INK),
    "muted":ParagraphStyle("muted",fontName=FONT,fontSize=7.5,leading=10.2,textColor=MUTED),
    "section":ParagraphStyle("section",fontName=BOLD,fontSize=14.2,leading=17.2,textColor=NAVY,spaceAfter=3),
    "label":ParagraphStyle("label",fontName=BOLD,fontSize=7.8,leading=9.2,textColor=MUTED,alignment=TA_CENTER),
    "kpi":ParagraphStyle("kpi",fontName=BOLD,fontSize=24,leading=25,alignment=TA_CENTER),
    "hero":ParagraphStyle("hero",fontName=BOLD,fontSize=29,leading=30,textColor=WHITE),
    "hero_sub":ParagraphStyle("hero_sub",fontName=BOLD,fontSize=11.8,leading=13.5,textColor=colors.HexColor("#E4BF77")),
    "hero_meta":ParagraphStyle("hero_meta",fontName=FONT,fontSize=7.6,leading=9.5,textColor=colors.HexColor("#DCE5F0")),
    "table_h":ParagraphStyle("table_h",fontName=BOLD,fontSize=6.5,leading=8,textColor=WHITE),
    "table":ParagraphStyle("table",fontName=FONT,fontSize=7.2,leading=9.4,textColor=INK),
    "table_b":ParagraphStyle("table_b",fontName=BOLD,fontSize=7.2,leading=9.4,textColor=INK),
    "chart_title":ParagraphStyle("chart_title",fontName=BOLD,fontSize=7.3,leading=9,textColor=NAVY),
    "chart_note":ParagraphStyle("chart_note",fontName=FONT,fontSize=7,leading=9.3,textColor=MUTED),
    "action":ParagraphStyle("action",fontName=FONT,fontSize=8.8,leading=12.4,textColor=INK),
}

# ---------- HELPERS ----------
def clean(v:Any)->str:
    if v is None:return ""
    return str(v).replace("\u00a0"," ").replace("\u2013","-").replace("\u2014","-").replace("\u2212","-")

def n(v:Any,default:float=0.0)->float:
    try:
        x=float(v)
        return default if pd.isna(x) else x
    except (TypeError,ValueError):
        return default

def P(v:Any,style:str="body")->Paragraph:
    if style not in ST: style="body"
    return Paragraph(escape(clean(v)),ST[style])

def fmt(v:Any,d:int=0)->str:return f"{n(v):,.{d}f}"
def pct(v:Any,d:int=1)->str:return f"{n(v):.{d}f}%"

def flow_group(*parts):
    return KeepTogether([x for x in parts if x is not None])

def section_title(text):
    line=Table([[""]],colWidths=[CW],rowHeights=[0.8*mm])
    line.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1),AMBER),
        ("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),0),
        ("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),0)
    ]))
    return [P(text,"section"),line,Spacer(1,2.5*mm)]

def panel(content,width=CW,bg=WHITE,pad=7,border=LINE,height=None):
    if isinstance(content,(list,tuple)):
        content=list(content)
    else:
        content=[content]
    if height:
        inner=KeepInFrame(max(width-2*pad,10),max(height-2*pad,10),content,mode="shrink")
        t=Table([[inner]],colWidths=[width],rowHeights=[height])
    else:
        t=Table([[content]],colWidths=[width])
    t.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1),bg),
        ("BOX",(0,0),(-1,-1),.55,border),
        ("LEFTPADDING",(0,0),(-1,-1),pad),
        ("RIGHTPADDING",(0,0),(-1,-1),pad),
        ("TOPPADDING",(0,0),(-1,-1),pad),
        ("BOTTOMPADDING",(0,0),(-1,-1),pad),
        ("VALIGN",(0,0),(-1,-1),"TOP")
    ]))
    return t

def bullet_rows(items,width):
    rows=[]
    dot=ParagraphStyle("dot",parent=ST["body"],fontName=BOLD,fontSize=8,leading=10,textColor=AMBER)
    for item in items or []:
        rows.append([Paragraph("•",dot),P(item,"body")])
    if not rows:return Spacer(1,0)
    t=Table(rows,colWidths=[5*mm,max(width-5*mm,1)])
    t.setStyle(TableStyle([
        ("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),0),
        ("RIGHTPADDING",(0,0),(-1,-1),2),("TOPPADDING",(0,0),(-1,-1),2.0),
        ("BOTTOMPADDING",(0,0),(-1,-1),2.0)
    ]))
    return t

def section_block(name,content,bg=WHITE,pad=7):
    return [flow_group(*section_title(name),panel(content,CW,bg,pad)),Spacer(1,G)]

# ---------- PAGE ----------
def page_frame(canvas,doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE);canvas.setLineWidth(.45)
    canvas.line(L,PH-9.5*mm,PW-R,PH-9.5*mm);canvas.line(L,9.5*mm,PW-R,9.5*mm)
    canvas.setFillColor(NAVY);canvas.setFont(BOLD,6.5)
    canvas.drawString(L,PH-6.7*mm,"FIBRION")
    canvas.setFillColor(MUTED);canvas.setFont(FONT,6.2)
    canvas.drawRightString(PW-R,PH-6.7*mm,"PRODUCTION INTELLIGENCE")
    canvas.drawString(L,5.7*mm,"Fibrion AI  |  Operational report")
    canvas.drawRightString(PW-R,5.7*mm,f"Page {doc.page}")
    canvas.restoreState()

# ---------- HERO ----------
class FibrionHero(Flowable):
    """Editorial hero with a subtle production-signal motif."""
    def __init__(self,module,state,kpi):
        super().__init__()
        self.module=module
        self.state=state
        self.kpi=kpi
        self.width=CW
        self.height=37*mm

    def wrap(self,availWidth,availHeight):
        self.width=min(self.width,availWidth)
        return self.width,self.height

    def draw(self):
        c=self.canv
        w=self.width
        h=self.height

        # Main card
        c.setFillColor(NAVY)
        c.roundRect(0,0,w,h,3.5*mm,stroke=0,fill=1)

        # Soft secondary panel on the right
        right_w=42*mm
        c.setFillColor(colors.HexColor("#1D3557"))
        c.roundRect(w-right_w,0,right_w,h,3.5*mm,stroke=0,fill=1)

        # Gold editorial accent
        c.setFillColor(AMBER)
        c.roundRect(7.5*mm,7*mm,1.4*mm,h-14*mm,0.7*mm,stroke=0,fill=1)

        # Main title
        c.setFillColor(WHITE)
        c.setFont(BOLD,29)
        c.drawString(14*mm,h-14*mm,"FIBRION")

        c.setFillColor(AMBER)
        c.setFont(BOLD,11.8)
        process=clean(self.module.process_name).upper()
        c.drawString(14*mm,h-22.5*mm,f"{process} PRODUCTION INTELLIGENCE")

        # Meta line
        months=list(self.kpi.get("monthly_production_yds",{}).keys())
        period=f"{months[0]} - {months[-1]}" if len(months)>1 else (months[0] if months else "")
        meta=f"{period}   |   {fmt(self.state.validation_report.get('row_count'))} production records   |   Generated {datetime.now(timezone.utc):%d %b %Y}"
        c.setFillColor(colors.HexColor("#DCE5F0"))
        c.setFont(FONT,7.3)
        c.drawString(14*mm,8.5*mm,meta)

        # Small label
        c.setFillColor(colors.HexColor("#9FB0C7"))
        c.setFont(BOLD,5.7)
        c.drawString(w-right_w+5*mm,h-8*mm,"PRODUCTION SIGNAL")

        # Subtle sparkline from monthly production.
        vals=[n(v) for v in self.kpi.get("monthly_production_yds",{}).values()]
        if len(vals)>=2 and max(vals)>min(vals):
            x0=w-right_w+5*mm
            y0=12*mm
            pw=right_w-10*mm
            ph=15*mm
            lo,hi=min(vals),max(vals)
            step=pw/(len(vals)-1)
            pts=[]
            for i,v in enumerate(vals):
                x=x0+i*step
                y=y0+((v-lo)/(hi-lo))*ph
                pts.append((x,y))

            c.setStrokeColor(colors.HexColor("#4C78A8"))
            c.setLineWidth(1.15)
            p=c.beginPath()
            p.moveTo(*pts[0])
            for x,y in pts[1:]:
                p.lineTo(x,y)
            c.drawPath(p,stroke=1,fill=0)

            c.setFillColor(AMBER)
            for x,y in pts[::max(1,len(pts)//5)]:
                c.circle(x,y,1.05,stroke=0,fill=1)

        # Small intelligence marker
        c.setStrokeColor(colors.HexColor("#4C78A8"))
        c.setLineWidth(.45)
        c.line(w-right_w+5*mm,9*mm,w-5*mm,9*mm)

def hero(module,state,kpi):
    return FibrionHero(module,state,kpi)

# ---------- KPI ----------
def kpi_card(value,label,accent,width):
    bg={GREEN:PALE_GREEN,RED:PALE_RED,ORANGE:PALE_AMBER,BLUE:PALE_BLUE}[accent]
    vs=ParagraphStyle(
        f"kpi_{label}",parent=ST["kpi"],textColor=accent,
        alignment=TA_CENTER
    )
    ls=ParagraphStyle(
        f"kpi_label_{label}",parent=ST["label"],fontSize=7.2,leading=8.5,
        alignment=TA_CENTER,textColor=INK
    )

    # Full-width paragraph cells make the visual centerline identical
    # for the number and its label.
    value_p=Paragraph(escape(clean(value)),vs)
    label_p=Paragraph(label.upper(),ls)

    t=Table(
        [[value_p],[label_p]],
        colWidths=[width],
        rowHeights=[9.5*mm,5.8*mm],
        hAlign="CENTER"
    )
    t.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1),bg),
        ("BOX",(0,0),(-1,-1),.55,LINE),
        ("LINEABOVE",(0,0),(-1,0),2,accent),
        ("ALIGN",(0,0),(-1,-1),"CENTER"),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ("LEFTPADDING",(0,0),(-1,-1),0),
        ("RIGHTPADDING",(0,0),(-1,-1),0),
        ("TOPPADDING",(0,0),(-1,-1),0),
        ("BOTTOMPADDING",(0,0),(-1,-1),0),
    ]))
    return t

def executive_metrics(kpi):
    o=kpi.get("overall",{})
    f,r,s=n(o.get("overall_fulfillment_pct")),n(o.get("overall_rejection_pct")),n(o.get("avg_shrink_variance_pct"))
    fc=GREEN if f>=90 else ORANGE if f>=70 else RED
    rc=GREEN if r<=2 else ORANGE if r<=5 else RED
    sc=GREEN if abs(s)<=15 else ORANGE if abs(s)<=25 else RED
    w=(CW-2*G)/3
    t=Table([[
        kpi_card(pct(f),"Fulfillment",fc,w),
        kpi_card(pct(r,2),"Rejection",rc,w),
        kpi_card(pct(s),"Shrinkage",sc,w)
    ]],colWidths=[w,w,w],hAlign="CENTER")
    t.setStyle(TableStyle([
        ("VALIGN",(0,0),(-1,-1),"TOP"),
        ("LEFTPADDING",(0,0),(-1,-1),0),
        ("RIGHTPADDING",(0,0),(-1,-1),G),
        ("RIGHTPADDING",(-1,0),(-1,0),0),
    ]))
    return t

# ---------- PRODUCTION ----------
def production_balance(kpi):
    o=kpi.get("overall",{})
    produced=n(o.get("total_produced_grey_yds"))
    required=n(o.get("total_required_grey_yds"))

    shortfall=max(required-produced,0)
    delivery=min(produced/required,1) if required>0 else 0

    inner=CW-14*mm
    col=inner/3

    metrics=Table([
        [P("PRODUCED","label"),P("REQUIRED","label"),P("GAP","label")],
        [P(fmt(produced),"table_b"),
         P(fmt(required),"table_b"),
         P(fmt(shortfall),"table_b")],
        [P("grey yards","muted"),
         P("grey yards","muted"),
         P("yards below requirement","muted")]
    ],colWidths=[col,col,col])

    metrics.setStyle(TableStyle([
        ("LEFTPADDING",(0,0),(-1,-1),0),
        ("RIGHTPADDING",(0,0),(-1,-1),0),
        ("TOPPADDING",(0,0),(-1,-1),2),
        ("BOTTOMPADDING",(0,0),(-1,-1),2),
        ("VALIGN",(0,0),(-1,-1),"TOP"),
    ]))

    done=max(inner*delivery,0.1)
    remain=max(inner-done,0.1)

    bar=Table(
        [["",""]],
        colWidths=[done,remain],
        rowHeights=[3.5*mm]
    )

    bar.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(0,0),BLUE),
        ("BACKGROUND",(1,0),(1,0),colors.HexColor("#E5E9EF")),
        ("BOX",(0,0),(-1,-1),.3,LINE),
        ("LEFTPADDING",(0,0),(-1,-1),0),
        ("RIGHTPADDING",(0,0),(-1,-1),0),
        ("TOPPADDING",(0,0),(-1,-1),0),
        ("BOTTOMPADDING",(0,0),(-1,-1),0),
    ]))

    foot=Table([[
        P(f"{delivery*100:.1f}% of required volume delivered","table_b"),
        P("The shortfall is the primary headline production gap.","muted")
    ]],colWidths=[inner*.45,inner*.55])

    foot.setStyle(TableStyle([
        ("ALIGN",(1,0),(1,0),"RIGHT"),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ("LEFTPADDING",(0,0),(-1,-1),0),
        ("RIGHTPADDING",(0,0),(-1,-1),0),
        ("TOPPADDING",(0,0),(-1,-1),3),
        ("BOTTOMPADDING",(0,0),(-1,-1),0),
    ]))

    return [
        metrics,
        Spacer(1,2),
        bar,
        foot
    ]

# ---------- OVERVIEW ----------
def summary_panel(state):
    if not state.analysis_executive_summary:
        return []
    return [
        *section_title("Executive Summary"),
        panel(P(state.analysis_executive_summary,"body"),CW,PALE_BLUE,8),
        Spacer(1,4*mm)
    ]

def findings_panel(state):
    if not state.analysis_key_findings:
        return []
    return [
        *section_title("Key Findings"),
        panel(bullet_rows(state.analysis_key_findings,CW-18),CW,WHITE,7.5),
        Spacer(1,3*mm)
    ]

def quality_panel(state,kpi):
    vr=state.validation_report or {}
    dup=n(vr.get("duplicates",{}).get("fraction"))*100
    ex=n(kpi.get("excluded_orders",{}).get("count"))
    s=kpi.get("supplementary_and_non_order_summary",{})
    supp,non=n(s.get("supplementary_order_count")),n(s.get("non_order_material_count"))

    cells=Table([[
        [P(f"{dup:.0f}%","table_b"),P("duplicate / forward-filled rows","muted")],
        [P(f"{ex:,.0f}","table_b"),P("orders without checkpoint data","muted")],
        [P(f"{supp:,.0f} supplementary  |  {non:,.0f} non-order","table_b"),P("entries excluded from headline fulfillment","muted")]
    ]],colWidths=[CW/3,CW/3,CW/3])

    cells.setStyle(TableStyle([
        ("VALIGN",(0,0),(-1,-1),"TOP"),
        ("LEFTPADDING",(0,0),(-1,-1),0),
        ("RIGHTPADDING",(0,0),(-1,-1),4),
        ("RIGHTPADDING",(-1,0),(-1,0),0),
        ("TOPPADDING",(0,0),(-1,-1),1.5),
        ("BOTTOMPADDING",(0,0),(-1,-1),1.5),
    ]))

    return [
        *section_title("Data Quality"),
        panel(cells,CW,PALE_AMBER,7)
    ]

# ---------- CHARTS ----------
def chart_image(path,width,height):
    try:
        with PILImage.open(path) as im:
            iw,ih=im.size
        if not iw or not ih:
            raise ValueError("Invalid chart dimensions")
        scale=min(width/iw,height/ih)
        return Image(path,width=iw*scale,height=ih*scale,hAlign="CENTER")
    except Exception as e:
        logger.warning("Chart loading failed: %s",e)
        return P("Chart unavailable.","muted")


def chart_panel(path,name,note,width):
    content=[
        P(name,"chart_title"),
        Spacer(1,2*mm),
        chart_image(path,width-10*mm,width-10*mm),
    ]
    if note:
        content += [
            Spacer(1,2*mm),
            P(note,"chart_note")
        ]
    return panel(
    content,
    width=width,
    bg=WHITE,
    pad=5,
    border=LINE
  )

def analytics_page(state,kpi):
    paths=state.chart_paths or []
    if not paths:
        return [
            *section_title("Production Analytics"),
            panel(P("No charts were generated for this run.","body"),CW,BG,7)
        ]

    names={
        "fulfillment_distribution":"Fulfillment Distribution",
        "monthly_production":"Monthly Production Trend",
        "top_anomalies":"Anomaly Severity",
        "rejection_by_construction":"Rejection by Construction"
    }

    notes={
        "fulfillment_distribution":"Order-level fulfillment distribution against the 90-110% target band.",
        "monthly_production":"Monthly grey-fabric production across the reporting period.",
        "top_anomalies":"Highest statistical deviations identified in the analyzed run.",
        "rejection_by_construction":"Average rejection across frequently occurring fabric constructions."
    }

    half=(CW-G)/2
    cells=[]

    for path in paths[:4]:
        key=Path(path).stem
        cells.append(
            chart_panel(
                path,
                names.get(key,key.replace("_"," ").title()),
                notes.get(key,""),
                half
            )
        )

    while len(cells)<4:
        cells.append(panel(P("No additional visualization was generated.","muted"),half,BG,5))

    grid=Table([cells[:2],cells[2:4]],colWidths=[half,half])

    grid.setStyle(TableStyle([
        ("VALIGN",(0,0),(-1,-1),"TOP"),
        ("LEFTPADDING",(0,0),(-1,-1),0),
        ("RIGHTPADDING",(0,0),(-1,-1),G),
        ("RIGHTPADDING",(1,0),(1,-1),0),
        ("TOPPADDING",(0,0),(-1,-1),0),
        ("BOTTOMPADDING",(0,0),(-1,-1),G)
    ]))

    analytical_note=(
        "Taken together, these views show where production performance is concentrated, "
        "how output changes over time, which orders represent statistically unusual behavior, "
        "and which fabric constructions carry greater rejection risk."
    )

    return [
        *section_title("Production Analytics"),
        grid,
        Spacer(1,G),
        panel(P(analytical_note,"small"),CW,PALE_BLUE,7)
    ]
# ---------- EXCEPTIONS ----------
def anomaly_table(anomalies):
    if not anomalies:return panel(P("No significant anomalies were detected in this run.","body"),CW,PALE_GREEN,7)
    ordered=sorted(anomalies,key=lambda x:abs(n(x.get("z_score"))),reverse=True)[:12]
    rows=[[P("ORDER","table_h"),P("METRIC","table_h"),P("VALUE","table_h"),P("RUN MEAN","table_h"),P("Z-SCORE","table_h")]]
    for a in ordered:
        rows.append([
            P(a.get("group_value"),"table_b"),
            P(str(a.get("metric","")).replace("_"," "),"table"),
            P(fmt(a.get("value"),2),"table"),
            P(fmt(a.get("run_mean"),2),"table"),
            P(fmt(a.get("z_score"),2),"table_b")
        ])
    t=Table(rows,colWidths=[CW*.19,CW*.30,CW*.17,CW*.17,CW*.17],repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0),NAVY2),("ROWBACKGROUNDS",(0,1),(-1,-1),[WHITE,BG]),
        ("GRID",(0,0),(-1,-1),.35,LINE),("ALIGN",(2,1),(-1,-1),"RIGHT"),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),("LEFTPADDING",(0,0),(-1,-1),5),
        ("RIGHTPADDING",(0,0),(-1,-1),5),("TOPPADDING",(0,0),(-1,-1),3.5),
        ("BOTTOMPADDING",(0,0),(-1,-1),3.5)
    ]))
    return t

def exceptions_page(state):
    anomalies=state.anomalies or []
    if not anomalies:
        return [*section_title("Quality Exceptions"),panel(P("No significant anomalies were detected in this run.","body"),CW,PALE_GREEN,7)]
    top=max(anomalies,key=lambda x:abs(n(x.get("z_score"))))
    critical=sum(1 for x in anomalies if n(x.get("value"))>=100 and "rejection" in str(x.get("metric","")).lower())
    intro=(f"Order {clean(top.get('group_value'))} is the most extreme statistical exception, with "
           f"{clean(top.get('metric')).replace('_',' ')} at {fmt(top.get('value'),2)} and a z-score of {fmt(top.get('z_score'),2)}.")
    if critical:intro+=f" The anomaly set also contains {critical} complete-rejection observations requiring immediate review."
    return [*section_title("Quality Exceptions"),panel(P(intro,"body"),CW,PALE_RED,7),Spacer(1,G),anomaly_table(anomalies)]

# ---------- CAUSES / ACTIONS ----------
def causes_actions(state):
    causes=state.analysis_likely_causes or []
    recs=state.analysis_recommendations or []

    story=[]

    if causes:
        story += [
            *section_title("Likely Causes"),
            panel(
                bullet_rows(causes,CW-14),
                CW,
                WHITE,
                8
            ),
            Spacer(1,G)
        ]

    if recs:
        rows=[]
        num_style=ParagraphStyle(
            "action_num",
            parent=ST["kpi"],
            fontSize=10,
            leading=11,
            textColor=AMBER,
            alignment=TA_CENTER
        )

        for i,item in enumerate(recs,1):
            rows.append([
                Paragraph(f"{i:02d}",num_style),
                P(item,"action")
            ])

        actions=Table(
            rows,
            colWidths=[13*mm,CW-27*mm]
        )

        actions.setStyle(TableStyle([
            ("VALIGN",(0,0),(-1,-1),"TOP"),
            ("LEFTPADDING",(0,0),(-1,-1),0),
            ("RIGHTPADDING",(0,0),(-1,-1),4),
            ("TOPPADDING",(0,0),(-1,-1),4),
            ("BOTTOMPADDING",(0,0),(-1,-1),4)
        ]))

        story += [
            *section_title("Recommended Actions"),
            panel(actions,CW,PALE_AMBER,8)
        ]

    return story

# ---------- METHODOLOGY ----------
def methodology(state,kpi):
    vr=state.validation_report or {}
    dup=n(vr.get("duplicates",{}).get("fraction"))*100
    ex=n(kpi.get("excluded_orders",{}).get("count"))
    s=kpi.get("supplementary_and_non_order_summary",{})
    supp,non=n(s.get("supplementary_order_count")),n(s.get("non_order_material_count"))
    text1=("Production totals are derived from periodic order-level checkpoint records rather than being blindly summed "
           "across all shift-level rows. This reflects the reporting structure of the source data: a value can remain "
           "unchanged across multiple rows until the next checkpoint. Treating every repeated row as newly produced "
           "volume would materially inflate production totals.")
    text2=(f"Approximately {dup:.0f}% of raw rows are flagged as duplicate or forward-filled. {ex:,.0f} orders are excluded "
           f"where checkpoint data is unavailable. {supp:,.0f} supplementary/amendment orders and {non:,.0f} non-order-material "
           "entries are tracked separately because they are not directly comparable with standard customer orders for "
           "headline fulfillment calculations.")
    inner=max(CW-14,1)
    t=Table([[P("CALCULATION BASIS","label"),P("EXCLUSIONS & DATA QUALITY","label")],
             [P(text1,"small"),P(text2,"small")]],colWidths=[inner/2,inner/2])
    t.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1),BG),("BOX",(0,0),(-1,-1),.55,LINE),
        ("INNERGRID",(0,0),(-1,-1),.35,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),
        ("LEFTPADDING",(0,0),(-1,-1),7),("RIGHTPADDING",(0,0),(-1,-1),7),
        ("TOPPADDING",(0,0),(-1,-1),7),("BOTTOMPADDING",(0,0),(-1,-1),7)
    ]))
    return [*section_title("Methodology & Data Notes"),t]


def run_report(state:FibrionState)->dict:
    run_id_ctx.set(state.run_id)

    if state.error or not state.kpi_results:
        logger.warning("Skipping report generation - no KPI results available")
        return {}

    module=get_process_module(state.process_type)
    kpi=state.kpi_results

    out=Path("outputs/reports")/state.run_id
    out.mkdir(parents=True,exist_ok=True)
    report_path=out/"report.pdf"

    doc=SimpleDocTemplate(
        str(report_path),
        pagesize=A4,
        leftMargin=L,
        rightMargin=R,
        topMargin=T,
        bottomMargin=B,
        title=f"Fibrion - {module.process_name} Production Intelligence",
        author="Fibrion AI",
        creator="Fibrion AI",
        subject="Production Intelligence Report"
    )

    story=[
        hero(module,state,kpi),
        Spacer(1,4.5*mm),

        *summary_panel(state),

        *section_title("Executive Performance"),
        executive_metrics(kpi),
        Spacer(1,4.5*mm),

        *section_title("Production Balance"),
        panel(production_balance(kpi),CW,BG,7.5),
        Spacer(1,4.5*mm),

        *findings_panel(state),
        Spacer(1,2.5*mm),
        *quality_panel(state,kpi),

        PageBreak(),

        *exceptions_page(state),
        Spacer(1,G),

        *analytics_page(state,kpi),
        Spacer(1,G),

        *causes_actions(state),

        Spacer(1,5*mm),
        *methodology(state,kpi),
    ]

    doc.build(
        story,
        onFirstPage=page_frame,
        onLaterPages=page_frame
    )

    logger.info("Report generated: %s",report_path)
    return {"report_path":str(report_path)}