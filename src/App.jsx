import { useState, useRef, useEffect } from "react";

const MODEL = "claude-sonnet-4-20250514";

const IFA_SYSTEM = `Tu es l'assistant expert d'IFA Consults (Inclusive Finance Accelerators), cabinet de conseil spécialisé en inclusion financière basé en Afrique de l'Ouest (site: www.ifaconsults.com).

PROFIL : Microfinance & IMF, Finance inclusive, Fintech & digitalisation, Régulation financière, Finance verte, Blended Finance, Microassurance, PME & entrepreneuriat, Études & évaluations d'impact, Assistance technique, Formations & renforcement de capacités, Conception de produits financiers inclusifs.
ZONES : UEMOA, CEDEAO, Afrique Centrale, Afrique subsaharienne.
BAILLEURS : PNUD, Banque Mondiale/IFC, BAD, BOAD, AFD/PROPARCO, USAID, GIZ, UE, CGAP, ADA Luxembourg, ONU Femmes, FIDA, gouvernements africains.
Réponds toujours en français avec un ton professionnel et expert.`;

const C = {
  bg:"#0d1117", surface:"#161b22", card:"#1c2333", border:"#30363d",
  accent:"#00c896", accentDim:"#00c89615", gold:"#e8a020", goldDim:"#e8a02015",
  blue:"#4493f8", blueDim:"#4493f815", purple:"#bc8cff", purpleDim:"#bc8cff15",
  pink:"#f778ba", pinkDim:"#f778ba15",
  text:"#e6edf3", muted:"#7d8590", danger:"#f85149", warn:"#d29922", success:"#3fb950",
};

// ─── Utilities ───
const Tag = ({color=C.accent,children,small,onClick})=>(
  <span onClick={onClick} style={{padding:small?"1px 6px":"2px 9px",background:`${color}18`,border:`1px solid ${color}40`,color,fontSize:small?9:10,fontFamily:"monospace",letterSpacing:"0.05em",borderRadius:2,whiteSpace:"nowrap",cursor:onClick?"pointer":"default"}}>{children}</span>
);
const Btn=({onClick,disabled,children,variant="primary",style={}})=>{
  const s={
    primary:{background:`linear-gradient(135deg,${C.accent},#00a87a)`,color:"#0d1117",border:"none"},
    secondary:{background:"transparent",color:C.muted,border:`1px solid ${C.border}`},
    gold:{background:C.goldDim,color:C.gold,border:`1px solid ${C.gold}44`},
    blue:{background:C.blueDim,color:C.blue,border:`1px solid ${C.blue}44`},
    purple:{background:C.purpleDim,color:C.purple,border:`1px solid ${C.purple}44`},
    pink:{background:C.pinkDim,color:C.pink,border:`1px solid ${C.pink}44`},
    danger:{background:"transparent",color:C.danger,border:`1px solid ${C.danger}44`},
  };
  return <button onClick={onClick} disabled={disabled} style={{...s[variant],padding:"9px 18px",fontFamily:"monospace",fontSize:11,fontWeight:700,letterSpacing:"0.07em",cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,transition:"all 0.2s",...style}}>{children}</button>;
};
const Loader=({text="En cours"})=>(
  <div style={{display:"flex",alignItems:"center",gap:8,color:C.muted}}>
    <span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span>
    <span style={{fontFamily:"monospace",fontSize:11,letterSpacing:"0.06em"}}>{text}…</span>
  </div>
);
const Field=({label,value,onChange,type="text",placeholder="",rows,full})=>(
  <div style={{marginBottom:12,gridColumn:full?"1/-1":""}}>
    <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em",fontFamily:"monospace",marginBottom:4}}>{label}</div>
    {rows
      ?<textarea value={value} onChange={e=>onChange(e.target.value)} rows={rows} placeholder={placeholder}
          style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,color:C.text,padding:"8px 12px",fontFamily:"monospace",fontSize:12,resize:"vertical",outline:"none"}}/>
      :<input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
          style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,color:C.text,padding:"8px 12px",fontFamily:"monospace",fontSize:12,outline:"none"}}/>
    }
  </div>
);

const PIPELINE_STATUSES=[
  {id:"veille",label:"EN VEILLE",color:C.muted,icon:"◎"},
  {id:"qualification",label:"QUALIFICATION",color:C.blue,icon:"◈"},
  {id:"redaction",label:"RÉDACTION",color:C.gold,icon:"✦"},
  {id:"soumis",label:"SOUMIS",color:C.purple,icon:"▶"},
  {id:"gagne",label:"GAGNÉ",color:C.success,icon:"★"},
  {id:"perdu",label:"PERDU",color:C.danger,icon:"✕"},
];

const OFFER_SECTIONS=[
  {id:"presentation",label:"1. Présentation du cabinet",icon:"🏛"},
  {id:"comprehension",label:"2. Compréhension du mandat",icon:"🎯"},
  {id:"commentaire_tdr",label:"3. Commentaires sur les TDR",icon:"📋"},
  {id:"methodologie",label:"4. Méthodologie",icon:"⚙️"},
  {id:"calendrier",label:"5. Calendrier",icon:"📅"},
  {id:"cv_experts",label:"6. CV des experts",icon:"👤"},
];

const CONTENT_TYPES=[
  {id:"debut_semaine",label:"Début de semaine",icon:"🌅",color:C.accent,desc:"Message motivant du lundi avec insight du secteur"},
  {id:"bon_weekend",label:"Bon weekend",icon:"🌇",color:C.purple,desc:"Message de fin de semaine chaleureux"},
  {id:"actu_sectorielle",label:"Actualité sectorielle",icon:"📰",color:C.blue,desc:"Analyse d'une actualité de la finance inclusive"},
  {id:"conseil_pratique",label:"Conseil pratique",icon:"💡",color:C.gold,desc:"Tips et bonnes pratiques pour IMF/acteurs"},
  {id:"infographie",label:"Contenu infographique",icon:"📊",color:C.pink,desc:"Données et statistiques clés à partager"},
  {id:"etude_cas",label:"Étude de cas",icon:"🔍",color:C.success,desc:"Exemple de bonne pratique terrain"},
  {id:"thread_linkedin",label:"Thread LinkedIn",icon:"🔗",color:C.blue,desc:"Série de posts connectés pour LinkedIn"},
  {id:"tribune",label:"Tribune d'expert",icon:"✍️",color:C.purple,desc:"Article de fond signé par IFA Consults"},
];

const INITIAL_PIPELINE=[
  {id:1,title:"Évaluation programme finance inclusive - PNUD Sénégal",bailleur:"PNUD",pays:"Sénégal",type:"Évaluation",budget:"80 000 USD",deadline:"2026-03-28",score:88,status:"qualification",priority:"haute",notes:"Contact établi avec bureau PNUD Dakar",dateAdded:"2026-02-15",tdr:"",source:"ungm.org",sourceUrl:"https://www.ungm.org",tdrUrl:""},
  {id:2,title:"AT renforcement IMF - AFD Côte d'Ivoire",bailleur:"AFD",pays:"Côte d'Ivoire",type:"Assistance technique",budget:"150 000 EUR",deadline:"2026-04-10",score:92,status:"redaction",priority:"haute",notes:"Offre en cours de rédaction",dateAdded:"2026-02-20",tdr:"",source:"afd.fr",sourceUrl:"https://www.afd.fr/fr/ressources/appels-offres",tdrUrl:""},
  {id:3,title:"Étude fintech paiements mobiles - Banque Mondiale",bailleur:"Banque Mondiale",pays:"Burkina Faso",type:"Étude de marché",budget:"60 000 USD",deadline:"2026-05-01",score:75,status:"veille",priority:"normale",notes:"",dateAdded:"2026-03-01",tdr:"",source:"devex.com",sourceUrl:"https://www.devex.com",tdrUrl:""},
];

// ══════════════════════════════════════════
// MODULE VEILLE — avec source + liens TDR
// ══════════════════════════════════════════
function VeilleModule({onAddToPipeline}){
  const [searching,setSearching]=useState(false);
  const [results,setResults]=useState([]);
  const [log,setLog]=useState([]);
  const [activeDomains,setActiveDomains]=useState(["Microfinance","Fintech","Évaluation","Formation"]);
  const [activeRegions,setActiveRegions]=useState(["UEMOA","CEDEAO"]);
  const [expandedId,setExpandedId]=useState(null);

  const DOMAINS=["Microfinance","Fintech","Finance verte","Blended Finance","Évaluation","Formation","PME","Microassurance"];
  const REGIONS=["UEMOA","CEDEAO","Afrique Centrale","Afrique de l'Est","Global"];

  const runSearch=async()=>{
    setSearching(true);setResults([]);setLog([]);
    setLog(["🔍 Connexion IA avec recherche web active..."]);
    try{
      const resp=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:MODEL,max_tokens:5000,system:IFA_SYSTEM,
          tools:[{type:"web_search_20250305",name:"web_search"}],
          messages:[{role:"user",content:`Effectue une recherche web approfondie pour trouver des appels d'offres, appels à consultants et opportunités de mission ACTUELS et RÉCENTS pour IFA Consults.

DOMAINES : ${activeDomains.join(", ")}
RÉGIONS : ${activeRegions.join(", ")}

Recherche sur : ungm.org, devex.com, developmentaid.org, reliefweb.int, afd.fr, usaid.gov, giz.de, ec.europa.eu, bad.int, boad.org, cgap.org, tender.afdb.org

IMPORTANT : Pour chaque opportunité, fournis OBLIGATOIREMENT :
- La source exacte (nom de la plateforme)
- L'URL directe de la page de l'opportunité (pas juste la page d'accueil)
- L'URL des TDR si disponible (PDF ou page dédiée)
- La date limite de soumission PRÉCISE

Réponds UNIQUEMENT en JSON sans backticks :
{
  "opportunities":[{
    "id":"u1",
    "title":"titre exact",
    "bailleur":"organisation",
    "type":"type mission",
    "pays":"pays cible",
    "deadline":"YYYY-MM-DD ou texte exact",
    "budget":"montant ou Non précisé",
    "description":"2-3 phrases",
    "score":85,
    "score_justification":"pourquoi ce score",
    "source":"nom plateforme ex: UNGM, Devex, AFD...",
    "sourceUrl":"https://url-directe-opportunite.org/...",
    "tdrUrl":"https://url-tdr-ou-pdf.org/... ou null",
    "alerte":"URGENT si délai < 7 jours sinon null",
    "domaines":["microfinance"]
  }],
  "resume":"tendances observées",
  "nb_sources":5
}

Trouve au minimum 6 opportunités réelles.`}],
        }),
      });
      const data=await resp.json();
      const toolCount=data.content?.filter(b=>b.type==="tool_use").length||0;
      if(toolCount>0)setLog(p=>[...p,`🌐 ${toolCount} recherche(s) web effectuée(s)`]);
      const text=data.content?.filter(b=>b.type==="text").map(b=>b.text).join("")||"";
      setLog(p=>[...p,"📊 Structuration des résultats..."]);
      const m=text.match(/\{[\s\S]*"opportunities"[\s\S]*\}/);
      if(m){
        const parsed=JSON.parse(m[0]);
        setResults(parsed.opportunities||[]);
        setLog(p=>[...p,
          `✅ ${parsed.opportunities?.length||0} opportunités identifiées sur ${parsed.nb_sources||"plusieurs"} sources`,
          parsed.resume?`📈 ${parsed.resume}`:""
        ].filter(Boolean));
      }
    }catch(e){setLog(p=>[...p,`❌ ${e.message}`]);}
    setSearching(false);
  };

  const daysLeft=(dl)=>{
    if(!dl)return null;
    const d=new Date(dl);
    if(isNaN(d))return null;
    return Math.ceil((d-new Date())/86400000);
  };

  return(
    <div style={{padding:28}}>
      <div style={{maxWidth:900,margin:"0 auto"}}>
        <div style={{fontSize:10,color:C.accent,letterSpacing:"0.14em",marginBottom:6,fontFamily:"monospace"}}>◎ VEILLE AUTOMATISÉE — TEMPS RÉEL</div>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:400,marginBottom:20,color:C.text}}>Recherche d'opportunités</h2>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,padding:14}}>
            <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em",marginBottom:10,fontFamily:"monospace"}}>DOMAINES</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {DOMAINS.map(d=>(
                <button key={d} onClick={()=>setActiveDomains(p=>p.includes(d)?p.filter(x=>x!==d):[...p,d])}
                  style={{padding:"4px 10px",fontSize:11,fontFamily:"monospace",cursor:"pointer",background:activeDomains.includes(d)?C.accentDim:"transparent",color:activeDomains.includes(d)?C.accent:C.muted,border:`1px solid ${activeDomains.includes(d)?C.accent+"60":C.border}`,transition:"all 0.15s"}}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div style={{background:C.card,border:`1px solid ${C.border}`,padding:14}}>
            <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em",marginBottom:10,fontFamily:"monospace"}}>RÉGIONS CIBLES</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {REGIONS.map(r=>(
                <button key={r} onClick={()=>setActiveRegions(p=>p.includes(r)?p.filter(x=>x!==r):[...p,r])}
                  style={{padding:"4px 10px",fontSize:11,fontFamily:"monospace",cursor:"pointer",background:activeRegions.includes(r)?C.goldDim:"transparent",color:activeRegions.includes(r)?C.gold:C.muted,border:`1px solid ${activeRegions.includes(r)?C.gold+"60":C.border}`,transition:"all 0.15s"}}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Btn onClick={runSearch} disabled={searching}>{searching?"⟳ RECHERCHE EN COURS...":"⟳ LANCER LA VEILLE IA"}</Btn>

        {log.length>0&&(
          <div style={{marginTop:16,background:C.card,border:`1px solid ${C.border}`,padding:14}}>
            {log.map((l,i)=><div key={i} style={{fontSize:12,color:C.muted,marginBottom:4,fontFamily:"monospace"}}>{l}</div>)}
            {searching&&<Loader text="Interrogation des sources"/>}
          </div>
        )}

        {results.length>0&&(
          <div style={{marginTop:24}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em",fontFamily:"monospace"}}>{results.length} OPPORTUNITÉS · TRIÉES PAR PERTINENCE</div>
              <div style={{display:"flex",gap:8}}>
                <Tag color={C.success}>{results.filter(r=>r.score>=80).length} haute pertinence</Tag>
                {results.filter(r=>r.alerte==="URGENT").length>0&&<Tag color={C.danger}>{results.filter(r=>r.alerte==="URGENT").length} urgent</Tag>}
              </div>
            </div>

            {results.sort((a,b)=>(b.score||0)-(a.score||0)).map((opp,i)=>{
              const days=daysLeft(opp.deadline);
              const isExpanded=expandedId===opp.id;
              return(
                <div key={opp.id||i} style={{background:C.card,border:`1px solid ${isExpanded?C.accent+"60":C.border}`,marginBottom:10,animation:"fadeUp 0.3s ease both",animationDelay:`${i*0.05}s`,transition:"border-color 0.2s"}}>
                  {/* Row principal */}
                  <div style={{padding:16,cursor:"pointer"}} onClick={()=>setExpandedId(isExpanded?null:opp.id)}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div style={{flex:1}}>
                        {/* Badges ligne 1 */}
                        <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
                          {opp.alerte==="URGENT"&&<Tag color={C.danger}>🔴 URGENT</Tag>}
                          <Tag color={C.accent}>{opp.type}</Tag>
                          <Tag color={C.muted}>{opp.pays}</Tag>
                          {/* SOURCE BADGE — cliquable */}
                          {opp.source&&(
                            <a href={opp.sourceUrl||"#"} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}
                              style={{padding:"2px 9px",background:`${C.blue}18`,border:`1px solid ${C.blue}40`,color:C.blue,fontSize:10,fontFamily:"monospace",letterSpacing:"0.05em",borderRadius:2,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:4}}>
                              🔗 {opp.source} ↗
                            </a>
                          )}
                        </div>
                        {/* Titre */}
                        <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.text,marginBottom:6,lineHeight:1.3}}>{opp.title}</div>
                        {/* Méta : bailleur · budget · deadline */}
                        <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"center"}}>
                          <span style={{fontSize:12,color:C.muted}}><b style={{color:C.text}}>{opp.bailleur}</b></span>
                          {opp.budget&&opp.budget!=="Non précisé"&&<span style={{fontSize:12,color:C.gold,fontFamily:"monospace"}}>{opp.budget}</span>}
                          {opp.deadline&&(
                            <span style={{fontSize:11,fontFamily:"monospace",color:days!==null&&days<=7?C.danger:days!==null&&days<=14?C.warn:C.muted}}>
                              ⏱ {opp.deadline}{days!==null?` · J-${days}`:""}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Score */}
                      <div style={{textAlign:"center",marginLeft:16,flexShrink:0}}>
                        <div style={{fontSize:24,fontWeight:700,fontFamily:"monospace",color:opp.score>=80?C.success:opp.score>=60?C.warn:C.danger,lineHeight:1}}>{opp.score}</div>
                        <div style={{fontSize:9,color:C.muted,fontFamily:"monospace"}}>SCORE</div>
                        <div style={{fontSize:10,marginTop:6,color:C.muted}}>{isExpanded?"▲":"▼"}</div>
                      </div>
                    </div>
                  </div>

                  {/* EXPANDED — détail complet */}
                  {isExpanded&&(
                    <div style={{borderTop:`1px solid ${C.border}`,padding:16,animation:"fadeUp 0.25s ease"}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                        {/* Description */}
                        <div style={{background:C.surface,border:`1px solid ${C.border}`,padding:14}}>
                          <div style={{fontSize:9,color:C.muted,letterSpacing:"0.08em",fontFamily:"monospace",marginBottom:6}}>DESCRIPTION</div>
                          <p style={{fontSize:13,color:C.text,lineHeight:1.7,margin:0}}>{opp.description}</p>
                          {opp.score_justification&&<p style={{fontSize:11,color:C.accent+"99",lineHeight:1.6,marginTop:8,fontStyle:"italic"}}>{opp.score_justification}</p>}
                        </div>
                        {/* Liens */}
                        <div style={{background:C.surface,border:`1px solid ${C.border}`,padding:14}}>
                          <div style={{fontSize:9,color:C.muted,letterSpacing:"0.08em",fontFamily:"monospace",marginBottom:12}}>ACCÈS ET LIENS</div>
                          <div style={{display:"flex",flexDirection:"column",gap:10}}>
                            {/* Lien source */}
                            <div>
                              <div style={{fontSize:10,color:C.muted,marginBottom:4}}>📍 Source d'identification</div>
                              {opp.sourceUrl?(
                                <a href={opp.sourceUrl} target="_blank" rel="noreferrer"
                                  style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",background:C.blueDim,border:`1px solid ${C.blue}40`,color:C.blue,textDecoration:"none",fontSize:11,fontFamily:"monospace"}}>
                                  🌐 {opp.source||"Voir l'opportunité"} ↗
                                </a>
                              ):<span style={{fontSize:11,color:C.muted}}>Non disponible</span>}
                            </div>
                            {/* Lien TDR */}
                            <div>
                              <div style={{fontSize:10,color:C.muted,marginBottom:4}}>📄 Termes de Référence (TDR)</div>
                              {opp.tdrUrl?(
                                <a href={opp.tdrUrl} target="_blank" rel="noreferrer"
                                  style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",background:C.goldDim,border:`1px solid ${C.gold}40`,color:C.gold,textDecoration:"none",fontSize:11,fontFamily:"monospace"}}>
                                  📥 Accéder aux TDR ↗
                                </a>
                              ):(
                                <div style={{padding:"8px 12px",background:C.card,border:`1px dashed ${C.border}`,fontSize:11,color:C.muted,fontFamily:"monospace"}}>
                                  TDR non encore publiés ou introuvables
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Actions */}
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        <Btn variant="gold" onClick={()=>onAddToPipeline(opp)} style={{fontSize:10,padding:"7px 16px"}}>★ AJOUTER AU PIPELINE</Btn>
                        {opp.sourceUrl&&<a href={opp.sourceUrl} target="_blank" rel="noreferrer" style={{color:C.blue,fontSize:11,fontFamily:"monospace",textDecoration:"none",display:"flex",alignItems:"center",padding:"7px 14px",border:`1px solid ${C.blue}40`,background:C.blueDim}}>↗ PAGE SOURCE</a>}
                        {opp.tdrUrl&&<a href={opp.tdrUrl} target="_blank" rel="noreferrer" style={{color:C.gold,fontSize:11,fontFamily:"monospace",textDecoration:"none",display:"flex",alignItems:"center",padding:"7px 14px",border:`1px solid ${C.gold}40`,background:C.goldDim}}>📄 TDR DIRECT</a>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// MODULE PIPELINE
// ══════════════════════════════════════════
function PipelineModule({pipeline,setPipeline,onOpenOffer}){
  const [view,setView]=useState("kanban");
  const [showAdd,setShowAdd]=useState(false);
  const [editOpp,setEditOpp]=useState(null);
  const [blank]=useState({title:"",bailleur:"",pays:"",type:"Évaluation",budget:"",deadline:"",score:"",priority:"normale",notes:"",tdr:"",source:"",sourceUrl:"",tdrUrl:""});
  const [newOpp,setNewOpp]=useState({...blank});

  const daysLeft=(dl)=>{
    if(!dl)return null;
    const d=new Date(dl);
    if(isNaN(d))return null;
    return Math.ceil((d-new Date())/86400000);
  };

  const addOpp=()=>{
    if(!newOpp.title)return;
    setPipeline(p=>[...p,{...newOpp,id:Date.now(),status:"qualification",dateAdded:new Date().toISOString().slice(0,10),score:parseInt(newOpp.score)||null}]);
    setNewOpp({...blank});setShowAdd(false);
  };
  const saveEdit=()=>{setPipeline(p=>p.map(o=>o.id===editOpp.id?editOpp:o));setEditOpp(null);};
  const moveStatus=(id,s)=>setPipeline(p=>p.map(o=>o.id===id?{...o,status:s}:o));
  const del=(id)=>setPipeline(p=>p.filter(o=>o.id!==id));

  const OppCard=({opp})=>{
    const days=daysLeft(opp.deadline);
    const st=PIPELINE_STATUSES.find(s=>s.id===opp.status);
    return(
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderLeft:`3px solid ${st?.color||C.border}`,padding:12,marginBottom:8}}
        onClick={()=>setEditOpp({...opp})}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
          <Tag color={opp.priority==="haute"?C.danger:C.muted} small>{opp.priority?.toUpperCase()}</Tag>
          {opp.score&&<span style={{fontFamily:"monospace",fontSize:14,fontWeight:700,color:opp.score>=80?C.success:opp.score>=60?C.warn:C.danger}}>{opp.score}</span>}
        </div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,color:C.text,lineHeight:1.3,marginBottom:6,cursor:"pointer"}}>{opp.title}</div>
        <div style={{fontSize:11,color:C.muted}}>{opp.bailleur} · {opp.pays}</div>
        {/* Source badge */}
        {opp.source&&(
          <div style={{marginTop:6}}>
            <a href={opp.sourceUrl||"#"} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}
              style={{fontSize:9,color:C.blue,fontFamily:"monospace",textDecoration:"none",display:"inline-flex",alignItems:"center",gap:3}}>
              🔗 {opp.source} ↗
            </a>
            {opp.tdrUrl&&<a href={opp.tdrUrl} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{fontSize:9,color:C.gold,fontFamily:"monospace",textDecoration:"none",marginLeft:8}}>📄 TDR</a>}
          </div>
        )}
        {opp.deadline&&(
          <div style={{fontSize:10,color:days!==null&&days<=7?C.danger:days!==null&&days<=14?C.warn:C.muted,marginTop:6,fontFamily:"monospace"}}>
            ⏱ {opp.deadline}{days!==null?` · J-${days}`:""}
          </div>
        )}
        <div style={{marginTop:8,display:"flex",gap:6}}>
          <button onClick={e=>{e.stopPropagation();onOpenOffer(opp);}}
            style={{background:C.goldDim,color:C.gold,border:`1px solid ${C.gold}40`,padding:"4px 10px",fontSize:9,fontFamily:"monospace",cursor:"pointer"}}>✦ OFFRE</button>
          <button onClick={e=>{e.stopPropagation();del(opp.id);}}
            style={{background:"transparent",color:C.danger,border:`1px solid ${C.danger}30`,padding:"4px 8px",fontSize:9,cursor:"pointer"}}>✕</button>
        </div>
      </div>
    );
  };

  const FormModal=({opp,setOpp,onSave,onClose,title})=>(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}} onClick={onClose}>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,padding:28,width:600,maxHeight:"88vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:10,color:C.gold,letterSpacing:"0.12em",fontFamily:"monospace",marginBottom:16}}>{title}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
          <Field label="TITRE *" value={opp.title} onChange={v=>setOpp(p=>({...p,title:v}))} placeholder="Titre de l'appel" full/>
          <Field label="BAILLEUR" value={opp.bailleur} onChange={v=>setOpp(p=>({...p,bailleur:v}))} placeholder="PNUD, AFD..."/>
          <Field label="PAYS" value={opp.pays} onChange={v=>setOpp(p=>({...p,pays:v}))} placeholder="Sénégal..."/>
          <Field label="TYPE" value={opp.type} onChange={v=>setOpp(p=>({...p,type:v}))} placeholder="Évaluation, AT..."/>
          <Field label="BUDGET" value={opp.budget} onChange={v=>setOpp(p=>({...p,budget:v}))} placeholder="80 000 USD"/>
          <Field label="DEADLINE" value={opp.deadline} onChange={v=>setOpp(p=>({...p,deadline:v}))} type="date"/>
          <Field label="SCORE (0-100)" value={opp.score||""} onChange={v=>setOpp(p=>({...p,score:v}))} type="number" placeholder="85"/>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em",fontFamily:"monospace",marginBottom:4}}>PRIORITÉ</div>
            <select value={opp.priority||"normale"} onChange={e=>setOpp(p=>({...p,priority:e.target.value}))}
              style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,color:C.text,padding:"8px 12px",fontFamily:"monospace",fontSize:12}}>
              <option value="haute">Haute</option><option value="normale">Normale</option><option value="basse">Basse</option>
            </select>
          </div>
          <Field label="SOURCE (plateforme)" value={opp.source||""} onChange={v=>setOpp(p=>({...p,source:v}))} placeholder="UNGM, Devex, AFD..."/>
          <Field label="URL SOURCE (lien direct)" value={opp.sourceUrl||""} onChange={v=>setOpp(p=>({...p,sourceUrl:v}))} placeholder="https://ungm.org/..."/>
          <Field label="URL TDR (lien PDF ou page)" value={opp.tdrUrl||""} onChange={v=>setOpp(p=>({...p,tdrUrl:v}))} placeholder="https://..." full/>
          <Field label="NOTES INTERNES" value={opp.notes||""} onChange={v=>setOpp(p=>({...p,notes:v}))} rows={2} full/>
          <Field label="TDR — TEXTE COMPLET (pour génération IA)" value={opp.tdr||""} onChange={v=>setOpp(p=>({...p,tdr:v}))} rows={5} placeholder="Collez ici le texte intégral des TDR..." full/>
        </div>
        <div style={{marginTop:16,display:"flex",gap:10}}>
          <Btn variant="gold" onClick={onSave}>SAUVEGARDER</Btn>
          <Btn variant="secondary" onClick={onClose}>ANNULER</Btn>
        </div>
      </div>
    </div>
  );

  return(
    <div style={{padding:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <div style={{fontSize:10,color:C.gold,letterSpacing:"0.14em",fontFamily:"monospace"}}>◈ PIPELINE COMMERCIAL</div>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:400,color:C.text,marginTop:4}}>Suivi des opportunités · {pipeline.length} en cours</h2>
        </div>
        <div style={{display:"flex",gap:8}}>
          {["kanban","liste"].map(v=>(
            <button key={v} onClick={()=>setView(v)} style={{padding:"7px 14px",fontFamily:"monospace",fontSize:10,cursor:"pointer",background:view===v?C.goldDim:"transparent",color:view===v?C.gold:C.muted,border:`1px solid ${view===v?C.gold+"50":C.border}`}}>
              {v==="kanban"?"⊞ KANBAN":"≡ LISTE"}
            </button>
          ))}
          <Btn variant="gold" onClick={()=>setShowAdd(true)}>+ AJOUTER</Btn>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        {PIPELINE_STATUSES.map(s=>{
          const count=pipeline.filter(o=>o.status===s.id).length;
          return(
            <div key={s.id} style={{padding:"10px 14px",background:C.card,border:`1px solid ${s.color}30`,flex:1,textAlign:"center"}}>
              <div style={{fontFamily:"monospace",fontSize:18,fontWeight:700,color:s.color}}>{count}</div>
              <div style={{fontSize:8,color:C.muted,fontFamily:"monospace",letterSpacing:"0.05em"}}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* KANBAN */}
      {view==="kanban"&&(
        <div style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:12}}>
          {PIPELINE_STATUSES.map(s=>(
            <div key={s.id} style={{minWidth:215,flex:"0 0 215px"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,padding:"7px 10px",background:`${s.color}12`,border:`1px solid ${s.color}30`}}>
                <span style={{color:s.color}}>{s.icon}</span>
                <span style={{fontSize:9,fontFamily:"monospace",letterSpacing:"0.08em",color:s.color}}>{s.label}</span>
                <span style={{fontSize:11,color:C.muted,marginLeft:"auto"}}>{pipeline.filter(o=>o.status===s.id).length}</span>
              </div>
              {pipeline.filter(o=>o.status===s.id).map(opp=><OppCard key={opp.id} opp={opp}/>)}
            </div>
          ))}
        </div>
      )}

      {/* LISTE */}
      {view==="liste"&&(
        <div style={{background:C.surface,border:`1px solid ${C.border}`}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 110px 100px 110px 60px 100px 90px",padding:"10px 14px",borderBottom:`1px solid ${C.border}`,fontSize:9,color:C.muted,fontFamily:"monospace",letterSpacing:"0.07em"}}>
            <div>OPPORTUNITÉ</div><div>BAILLEUR</div><div>PAYS</div><div>DEADLINE</div><div>SCORE</div><div>STATUT</div><div>ACTIONS</div>
          </div>
          {pipeline.map(opp=>{
            const st=PIPELINE_STATUSES.find(s=>s.id===opp.status);
            const days=daysLeft(opp.deadline);
            return(
              <div key={opp.id} style={{display:"grid",gridTemplateColumns:"1fr 110px 100px 110px 60px 100px 90px",padding:"12px 14px",borderBottom:`1px solid ${C.border}`,alignItems:"center"}}
                onMouseEnter={e=>e.currentTarget.style.background=C.card}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,color:C.text,lineHeight:1.2,marginBottom:4}}>{opp.title}</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    <Tag color={opp.priority==="haute"?C.danger:C.muted} small>{opp.priority}</Tag>
                    {opp.source&&<a href={opp.sourceUrl||"#"} target="_blank" rel="noreferrer" style={{fontSize:9,color:C.blue,fontFamily:"monospace",textDecoration:"none"}}>🔗{opp.source}↗</a>}
                    {opp.tdrUrl&&<a href={opp.tdrUrl} target="_blank" rel="noreferrer" style={{fontSize:9,color:C.gold,fontFamily:"monospace",textDecoration:"none"}}>📄TDR</a>}
                  </div>
                </div>
                <div style={{fontSize:12,color:C.muted}}>{opp.bailleur}</div>
                <div style={{fontSize:12,color:C.muted}}>{opp.pays}</div>
                <div>
                  <div style={{fontSize:11,color:days!==null&&days<=7?C.danger:days!==null&&days<=14?C.warn:C.muted,fontFamily:"monospace"}}>{opp.deadline}</div>
                  {days!==null&&<div style={{fontSize:9,color:days<=7?C.danger:C.muted,fontFamily:"monospace"}}>J-{days}</div>}
                </div>
                <div style={{fontSize:14,fontWeight:700,fontFamily:"monospace",color:opp.score>=80?C.success:opp.score>=60?C.warn:C.danger}}>{opp.score}</div>
                <select value={opp.status} onChange={e=>moveStatus(opp.id,e.target.value)}
                  style={{background:`${st?.color}15`,border:`1px solid ${st?.color}40`,color:st?.color,padding:"4px 6px",fontSize:10,fontFamily:"monospace",cursor:"pointer",width:"100%"}}>
                  {PIPELINE_STATUSES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <div style={{display:"flex",gap:4}}>
                  <button onClick={()=>onOpenOffer(opp)} style={{background:C.goldDim,border:`1px solid ${C.gold}40`,color:C.gold,padding:"5px 8px",fontSize:10,cursor:"pointer"}}>✦</button>
                  <button onClick={()=>setEditOpp({...opp})} style={{background:C.blueDim,border:`1px solid ${C.blue}40`,color:C.blue,padding:"5px 8px",fontSize:10,cursor:"pointer"}}>✎</button>
                  <button onClick={()=>del(opp.id)} style={{background:"transparent",border:`1px solid ${C.danger}30`,color:C.danger,padding:"5px 8px",fontSize:10,cursor:"pointer"}}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd&&<FormModal opp={newOpp} setOpp={setNewOpp} onSave={addOpp} onClose={()=>setShowAdd(false)} title="+ NOUVELLE OPPORTUNITÉ"/>}
      {editOpp&&<FormModal opp={editOpp} setOpp={setEditOpp} onSave={saveEdit} onClose={()=>setEditOpp(null)} title="✎ MODIFIER L'OPPORTUNITÉ"/>}
    </div>
  );
}

// ══════════════════════════════════════════
// MODULE OFFRE (technique + financière)
// ══════════════════════════════════════════
function OfferModule({opp,onBack}){
  const [activeSection,setActiveSection]=useState("presentation");
  const [offerTab,setOfferTab]=useState("technique");
  const [sections,setSections]=useState({});
  const [generating,setGenerating]=useState(null);
  const [fin,setFin]=useState({
    honoraires:[{role:"Expert senior microfinance",jours:20,taux:600},{role:"Expert junior",jours:15,taux:350}],
    frais:[{poste:"Transport international",montant:1800},{poste:"Per diem terrain",montant:2400},{poste:"Reproduction rapports",montant:500}],
    marge:15,devise:"EUR",
  });

  const totalH=fin.honoraires.reduce((s,r)=>s+(r.jours*r.taux),0);
  const totalF=fin.frais.reduce((s,f)=>s+f.montant,0);
  const sT=totalH+totalF;
  const mM=Math.round(sT*fin.marge/100);
  const tot=sT+mM;

  const PROMPTS={
    presentation:`Rédige la section "Présentation du cabinet" pour une offre technique d'IFA Consults sur : "${opp.title}" (${opp.bailleur}, ${opp.pays}).
Présente IFA Consults comme un cabinet senior reconnu, met en avant les expertises pertinentes pour "${opp.type}", les zones d'intervention Afrique de l'Ouest, et quelques références types de missions similaires. 350-450 mots, ton professionnel à la 3ème personne. Rédige directement le texte.`,
    comprehension:`Rédige "Compréhension du mandat" pour : "${opp.title}" (${opp.pays}).
${opp.tdr?`TDR : ${opp.tdr.slice(0,1200)}`:`Description : ${opp.description||""}`}
Montre une compréhension fine des enjeux de la finance inclusive dans le contexte de ${opp.pays}, reformule la problématique centrale, identifie les défis et opportunités. 300-400 mots. Rédige directement.`,
    commentaire_tdr:`Rédige "Commentaires sur les TDR" pour : "${opp.title}" (${opp.bailleur}).
${opp.tdr?`TDR : ${opp.tdr.slice(0,1200)}`:`Type : ${opp.type}`}
Formule 4-5 observations constructives sur les TDR, propose des précisions méthodologiques, identifie des aspects complémentaires. Ton constructif et professionnel. 250-350 mots. Rédige directement.`,
    methodologie:`Rédige "Méthodologie de la mission" pour : "${opp.title}" (${opp.type}, ${opp.pays}).
${opp.tdr?`TDR : ${opp.tdr.slice(0,800)}`:""}
Développe une méthodologie en 4 phases (cadrage, collecte terrain, analyse, restitution) avec activités concrètes, outils, approches participatives et sensibilité genre. 450-550 mots. Rédige directement.`,
    calendrier:`Rédige "Calendrier de la mission" pour : "${opp.title}".
Présente un planning semaine par semaine avec activités, responsables et livrables sous forme de tableau textuel. Note sur flexibilité. 300-400 mots total.`,
    cv_experts:`Rédige "CV synthétiques des experts" pour : "${opp.title}" (${opp.type}).
Créé 2 profils détaillés et crédibles :
- Expert 1 : Senior en ${opp.type}/finance inclusive, 15 ans d'expérience, solide parcours Afrique de l'Ouest
- Expert 2 : Junior/analyste, 5 ans, terrain et collecte de données
Pour chaque : formation, 5-6 missions pertinentes, compétences techniques, langues. 200-250 mots par CV.`,
  };

  const genSection=async(id)=>{
    setGenerating(id);
    try{
      const resp=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:MODEL,max_tokens:1500,system:IFA_SYSTEM,messages:[{role:"user",content:PROMPTS[id]||`Rédige la section "${id}" pour l'offre sur "${opp.title}".`}]}),
      });
      const data=await resp.json();
      const text=data.content?.filter(b=>b.type==="text").map(b=>b.text).join("")||"";
      setSections(p=>({...p,[id]:text}));
    }catch(e){console.error(e);}
    setGenerating(null);
  };

  const genAll=async()=>{for(const s of OFFER_SECTIONS)await genSection(s.id);};
  const done=Object.keys(sections).length;

  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"14px 24px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
          <button onClick={onBack} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,padding:"5px 12px",fontFamily:"monospace",fontSize:10,cursor:"pointer"}}>← RETOUR</button>
          <div style={{fontSize:9,color:C.gold,letterSpacing:"0.12em",fontFamily:"monospace"}}>✦ RÉDACTION D'OFFRE</div>
          {opp.sourceUrl&&<a href={opp.sourceUrl} target="_blank" rel="noreferrer" style={{fontSize:10,color:C.blue,fontFamily:"monospace",textDecoration:"none"}}>🔗 {opp.source||"Source"} ↗</a>}
          {opp.tdrUrl&&<a href={opp.tdrUrl} target="_blank" rel="noreferrer" style={{fontSize:10,color:C.gold,fontFamily:"monospace",textDecoration:"none"}}>📄 TDR ↗</a>}
        </div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:C.text}}>{opp.title}</div>
        <div style={{fontSize:12,color:C.muted,marginTop:2}}>{opp.bailleur} · {opp.pays} · Deadline : {opp.deadline}</div>
        <div style={{display:"flex",gap:8,marginTop:12,alignItems:"center",flexWrap:"wrap"}}>
          {["technique","financiere"].map(t=>(
            <button key={t} onClick={()=>setOfferTab(t)} style={{padding:"7px 16px",fontFamily:"monospace",fontSize:11,cursor:"pointer",background:offerTab===t?(t==="technique"?C.goldDim:C.blueDim):"transparent",color:offerTab===t?(t==="technique"?C.gold:C.blue):C.muted,border:`1px solid ${offerTab===t?(t==="technique"?C.gold:C.blue)+"50":C.border}`}}>
              {t==="technique"?"✦ OFFRE TECHNIQUE":"◎ OFFRE FINANCIÈRE"}
            </button>
          ))}
          {offerTab==="technique"&&(
            <Btn variant="gold" onClick={genAll} disabled={!!generating} style={{fontSize:10,padding:"7px 14px"}}>
              {generating?"⟳ GÉNÉRATION...":"⟳ TOUT GÉNÉRER"}
            </Btn>
          )}
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:11,color:C.muted,fontFamily:"monospace"}}>{done}/{OFFER_SECTIONS.length}</span>
            <div style={{width:80,height:4,background:C.border,borderRadius:2}}>
              <div style={{width:`${(done/OFFER_SECTIONS.length)*100}%`,height:"100%",background:C.accent,borderRadius:2,transition:"width 0.4s"}}/>
            </div>
          </div>
        </div>
      </div>

      {offerTab==="technique"&&(
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>
          <div style={{width:210,borderRight:`1px solid ${C.border}`,background:C.surface,overflowY:"auto",flexShrink:0}}>
            {OFFER_SECTIONS.map(s=>{
              const isDone=!!sections[s.id];
              const isActive=activeSection===s.id;
              const isGen=generating===s.id;
              return(
                <div key={s.id} onClick={()=>setActiveSection(s.id)}
                  style={{padding:"11px 12px",borderBottom:`1px solid ${C.border}`,cursor:"pointer",background:isActive?C.card:"transparent",borderLeft:`3px solid ${isActive?C.gold:isDone?C.success+"60":"transparent"}`,transition:"all 0.15s"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span>{s.icon}</span>
                    <span style={{fontSize:11,color:isActive?C.text:C.muted,flex:1,lineHeight:1.3}}>{s.label}</span>
                    {isGen?<span style={{animation:"spin 1s linear infinite",display:"inline-block",color:C.gold,fontSize:12}}>⟳</span>:isDone?<span style={{color:C.success,fontSize:12}}>✓</span>:null}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            {(()=>{
              const sec=OFFER_SECTIONS.find(s=>s.id===activeSection);
              const content=sections[activeSection];
              const isGen=generating===activeSection;
              return(
                <>
                  <div style={{padding:"14px 22px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
                    <div style={{fontSize:10,color:C.gold,letterSpacing:"0.1em",fontFamily:"monospace"}}>{sec?.icon} {sec?.label?.toUpperCase()}</div>
                    <Btn variant="gold" onClick={()=>genSection(activeSection)} disabled={!!generating} style={{fontSize:10,padding:"6px 14px"}}>
                      {isGen?"⟳ GÉNÉRATION...":content?"↻ RÉGÉNÉRER":"✦ GÉNÉRER"}
                    </Btn>
                  </div>
                  <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
                    {isGen?(
                      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <div style={{textAlign:"center"}}><div style={{fontSize:36,color:C.gold,animation:"spin 1.5s linear infinite",display:"inline-block",marginBottom:12}}>⟳</div><div style={{fontFamily:"monospace",fontSize:12,color:C.muted}}>Rédaction en cours…</div></div>
                      </div>
                    ):(
                      <textarea value={content||""} onChange={e=>setSections(p=>({...p,[activeSection]:e.target.value}))}
                        placeholder={`Cliquez "Générer" pour rédiger avec l'IA, ou saisissez directement…`}
                        style={{flex:1,background:C.bg,border:"none",color:C.text,padding:"24px 28px",fontFamily:"Georgia,serif",fontSize:14,lineHeight:1.85,resize:"none",outline:"none",width:"100%"}}/>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {offerTab==="financiere"&&(
        <div style={{flex:1,overflowY:"auto",padding:28}}>
          <div style={{maxWidth:720,margin:"0 auto"}}>
            <div style={{fontSize:10,color:C.blue,letterSpacing:"0.12em",fontFamily:"monospace",marginBottom:16}}>◎ OFFRE FINANCIÈRE</div>
            <div style={{display:"flex",gap:10,marginBottom:20,alignItems:"center"}}>
              <span style={{fontSize:11,color:C.muted,fontFamily:"monospace"}}>DEVISE :</span>
              {["EUR","USD","XOF"].map(d=>(
                <button key={d} onClick={()=>setFin(p=>({...p,devise:d}))} style={{padding:"5px 12px",fontFamily:"monospace",fontSize:11,cursor:"pointer",background:fin.devise===d?C.blueDim:"transparent",color:fin.devise===d?C.blue:C.muted,border:`1px solid ${fin.devise===d?C.blue+"50":C.border}`}}>{d}</button>
              ))}
            </div>
            {/* Honoraires */}
            <div style={{marginBottom:20}}>
              <div style={{fontSize:9,color:C.blue,letterSpacing:"0.1em",fontFamily:"monospace",marginBottom:10}}>HONORAIRES</div>
              <div style={{background:C.card,border:`1px solid ${C.border}`}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 70px 90px 110px 30px",padding:"8px 12px",borderBottom:`1px solid ${C.border}`,fontSize:9,color:C.muted,fontFamily:"monospace"}}>
                  <div>RÔLE</div><div>JOURS</div><div>TAUX/J</div><div>TOTAL</div><div/>
                </div>
                {fin.honoraires.map((r,i)=>(
                  <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 70px 90px 110px 30px",padding:"10px 12px",borderBottom:`1px solid ${C.border}`,alignItems:"center"}}>
                    <input value={r.role} onChange={e=>setFin(p=>({...p,honoraires:p.honoraires.map((x,j)=>j===i?{...x,role:e.target.value}:x)}))} style={{background:"transparent",border:"none",color:C.text,fontFamily:"monospace",fontSize:12,outline:"none",width:"100%"}}/>
                    <input type="number" value={r.jours} onChange={e=>setFin(p=>({...p,honoraires:p.honoraires.map((x,j)=>j===i?{...x,jours:+e.target.value}:x)}))} style={{background:C.bg,border:`1px solid ${C.border}`,color:C.text,fontFamily:"monospace",fontSize:12,padding:"4px 6px",width:"100%",outline:"none"}}/>
                    <input type="number" value={r.taux} onChange={e=>setFin(p=>({...p,honoraires:p.honoraires.map((x,j)=>j===i?{...x,taux:+e.target.value}:x)}))} style={{background:C.bg,border:`1px solid ${C.border}`,color:C.text,fontFamily:"monospace",fontSize:12,padding:"4px 6px",width:"100%",outline:"none"}}/>
                    <div style={{fontFamily:"monospace",fontSize:12,color:C.accent}}>{(r.jours*r.taux).toLocaleString()} {fin.devise}</div>
                    <button onClick={()=>setFin(p=>({...p,honoraires:p.honoraires.filter((_,j)=>j!==i)}))} style={{background:"transparent",border:"none",color:C.danger,cursor:"pointer"}}>✕</button>
                  </div>
                ))}
                <button onClick={()=>setFin(p=>({...p,honoraires:[...p.honoraires,{role:"Nouvel expert",jours:10,taux:400}]}))} style={{display:"block",width:"100%",padding:"8px",background:"transparent",border:`1px dashed ${C.border}`,color:C.muted,fontFamily:"monospace",fontSize:10,cursor:"pointer"}}>+ AJOUTER EXPERT</button>
              </div>
            </div>
            {/* Frais */}
            <div style={{marginBottom:20}}>
              <div style={{fontSize:9,color:C.blue,letterSpacing:"0.1em",fontFamily:"monospace",marginBottom:10}}>FRAIS & DÉPENSES</div>
              <div style={{background:C.card,border:`1px solid ${C.border}`}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 140px 30px",padding:"8px 12px",borderBottom:`1px solid ${C.border}`,fontSize:9,color:C.muted,fontFamily:"monospace"}}><div>POSTE</div><div>MONTANT ({fin.devise})</div><div/></div>
                {fin.frais.map((f,i)=>(
                  <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 140px 30px",padding:"10px 12px",borderBottom:`1px solid ${C.border}`,alignItems:"center"}}>
                    <input value={f.poste} onChange={e=>setFin(p=>({...p,frais:p.frais.map((x,j)=>j===i?{...x,poste:e.target.value}:x)}))} style={{background:"transparent",border:"none",color:C.text,fontFamily:"monospace",fontSize:12,outline:"none"}}/>
                    <input type="number" value={f.montant} onChange={e=>setFin(p=>({...p,frais:p.frais.map((x,j)=>j===i?{...x,montant:+e.target.value}:x)}))} style={{background:C.bg,border:`1px solid ${C.border}`,color:C.text,fontFamily:"monospace",fontSize:12,padding:"4px 6px",outline:"none"}}/>
                    <button onClick={()=>setFin(p=>({...p,frais:p.frais.filter((_,j)=>j!==i)}))} style={{background:"transparent",border:"none",color:C.danger,cursor:"pointer"}}>✕</button>
                  </div>
                ))}
                <button onClick={()=>setFin(p=>({...p,frais:[...p.frais,{poste:"Nouveau poste",montant:0}]}))} style={{display:"block",width:"100%",padding:"8px",background:"transparent",border:`1px dashed ${C.border}`,color:C.muted,fontFamily:"monospace",fontSize:10,cursor:"pointer"}}>+ AJOUTER POSTE</button>
              </div>
            </div>
            {/* Marge */}
            <div style={{marginBottom:20,background:C.card,border:`1px solid ${C.border}`,padding:14,display:"flex",alignItems:"center",gap:14}}>
              <span style={{fontSize:12,color:C.muted,fontFamily:"monospace"}}>MARGE CABINET (%)</span>
              <input type="number" value={fin.marge} min={0} max={50} onChange={e=>setFin(p=>({...p,marge:+e.target.value}))} style={{background:C.bg,border:`1px solid ${C.border}`,color:C.text,fontFamily:"monospace",fontSize:14,padding:"6px 10px",width:70,outline:"none",textAlign:"center"}}/>
              <span style={{fontFamily:"monospace",fontSize:14,color:C.accent}}>{mM.toLocaleString()} {fin.devise}</span>
            </div>
            {/* Total */}
            <div style={{background:`linear-gradient(135deg,${C.card},${C.surface})`,border:`1px solid ${C.blue}40`,padding:22}}>
              <div style={{fontSize:10,color:C.blue,letterSpacing:"0.12em",fontFamily:"monospace",marginBottom:14}}>RÉCAPITULATIF</div>
              {[{l:"Honoraires",v:totalH},{l:"Frais & dépenses",v:totalF},{l:`Marge (${fin.marge}%)`,v:mM}].map(r=>(
                <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                  <span style={{fontSize:13,color:C.muted,fontFamily:"monospace"}}>{r.l}</span>
                  <span style={{fontFamily:"monospace",fontSize:13,color:C.text}}>{r.v.toLocaleString()} {fin.devise}</span>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",padding:"14px 0 0"}}>
                <span style={{fontSize:16,fontFamily:"'Playfair Display',serif",color:C.text}}>TOTAL</span>
                <span style={{fontFamily:"monospace",fontSize:22,fontWeight:700,color:C.accent}}>{tot.toLocaleString()} {fin.devise}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// MODULE COMMUNICATION DIGITALE
// ══════════════════════════════════════════
function CommModule(){
  const [subTab,setSubTab]=useState("calendrier");
  const [calendar,setCalendar]=useState(()=>{
    const weeks=[];
    const today=new Date("2026-03-02");
    for(let w=0;w<8;w++){
      const monday=new Date(today);
      monday.setDate(today.getDate()-today.getDay()+1+w*7);
      const friday=new Date(monday);friday.setDate(monday.getDate()+4);
      weeks.push({
        id:w+1,
        weekLabel:`Semaine ${w+1}`,
        dateRange:`${monday.toLocaleDateString("fr-FR",{day:"2-digit",month:"short"})} – ${friday.toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"})}`,
        monday:{date:monday.toISOString().slice(0,10),type:"debut_semaine",content:"",generated:false,platform:"LinkedIn"},
        friday:{date:friday.toISOString().slice(0,10),type:"bon_weekend",content:"",generated:false,platform:"LinkedIn"},
        midweek:[
          {date:new Date(monday.getTime()+86400000*1).toISOString().slice(0,10),type:"actu_sectorielle",content:"",generated:false,platform:"LinkedIn",topic:""},
          {date:new Date(monday.getTime()+86400000*2).toISOString().slice(0,10),type:"conseil_pratique",content:"",generated:false,platform:"LinkedIn",topic:""},
          {date:new Date(monday.getTime()+86400000*3).toISOString().slice(0,10),type:"infographie",content:"",generated:false,platform:"LinkedIn",topic:""},
        ]
      });
    }
    return weeks;
  });

  const [selectedWeek,setSelectedWeek]=useState(null);
  const [selectedPost,setSelectedPost]=useState(null);
  const [generating,setGenerating]=useState(false);
  const [contentLibrary,setContentLibrary]=useState([]);
  const [ideaTopic,setIdeaTopic]=useState("");
  const [ideaType,setIdeaType]=useState("actu_sectorielle");
  const [generatingIdea,setGeneratingIdea]=useState(false);

  const getTypeInfo=(id)=>CONTENT_TYPES.find(t=>t.id===id)||CONTENT_TYPES[0];

  const generatePost=async(weekId,slot,slotType)=>{
    setGenerating(`${weekId}-${slot}`);
    const typeInfo=getTypeInfo(slotType==="debut_semaine"?"debut_semaine":slotType==="bon_weekend"?"bon_weekend":selectedPost?.type||"actu_sectorielle");

    const prompts={
      debut_semaine:`Rédige un message de début de semaine pour IFA Consults à publier sur LinkedIn le lundi matin.
Le message doit :
- Être inspirant et professionnel, adapter au secteur de la finance inclusive en Afrique
- Partager un insight, une donnée ou une réflexion pertinente sur la microfinance/fintech/inclusion financière
- Motiver et engager la communauté (IMF, bailleurs, praticiens)
- Se terminer par une question ou un call-to-action
- Inclure 3-5 hashtags pertinents : #InclusionFinancière #Microfinance #AfriqueDeL'Ouest #IFAConsults etc.
- Longueur : 150-200 mots
- Ton : chaleureux, expert, inspirant
Commence directement par le texte du post (pas de titre).`,
      bon_weekend:`Rédige un message de fin de semaine pour IFA Consults sur LinkedIn (vendredi fin de journée).
Le message doit :
- Souhaiter un bon weekend à la communauté de façon chaleureuse et authentique
- Faire un bref récapitulatif inspirant de la semaine dans le secteur (une leçon ou fait marquant)
- Exprimer la fierté de contribuer à l'inclusion financière en Afrique
- Inviter à se ressourcer pour mieux servir les populations
- Hashtags pertinents
- 100-150 mots, ton chaleureux et humain`,
      actu_sectorielle:`Rédige un post LinkedIn d'actualité sectorielle pour IFA Consults sur : "${selectedPost?.topic||ideaTopic||"les tendances récentes de la microfinance en Afrique de l'Ouest"}".
Le post doit :
- Présenter l'actualité ou la tendance de façon claire et accessible
- Apporter une analyse experte d'IFA Consults (2-3 points clés)
- Relier l'information aux enjeux de l'inclusion financière en Afrique
- Inclure des données chiffrées si possible
- Se terminer par une question pour susciter le débat
- Hashtags sectoriels
- 200-250 mots`,
      conseil_pratique:`Rédige un post LinkedIn "conseil pratique" pour IFA Consults sur : "${selectedPost?.topic||ideaTopic||"la gestion du risque de crédit dans les IMF"}".
Format :
- Titre accrocheur en gras
- 3-5 conseils numérotés, concrets et actionnables pour les praticiens de la finance inclusive
- Chaque conseil en 1-2 phrases max
- Une note finale sur l'approche d'IFA Consults
- Hashtags
- 180-220 mots`,
      infographie:`Rédige le texte d'accompagnement d'une infographie LinkedIn pour IFA Consults sur : "${selectedPost?.topic||ideaTopic||"les chiffres clés de l'inclusion financière en Afrique 2025"}".
Le texte doit :
- Accrocher avec un chiffre ou fait frappant
- Présenter 4-6 données clés à mettre en visuel (format : "📊 Donnée : Valeur — Source")
- Ajouter un commentaire analytique d'IFA Consults
- Call-to-action pour télécharger le rapport ou contacter IFA Consults
- Hashtags
- 150-200 mots`,
      etude_cas:`Rédige un post LinkedIn "étude de cas" pour IFA Consults sur : "${selectedPost?.topic||ideaTopic||"une IMF ayant réussi sa transformation digitale en Afrique de l'Ouest"}".
Structure :
- Contexte et défi initial (1-2 phrases)
- Intervention et approche (2-3 points)
- Résultats et impact mesurable
- Leçon à retenir pour le secteur
- Hashtags
- 220-260 mots`,
      thread_linkedin:`Rédige un thread LinkedIn (série de 5 posts connectés) pour IFA Consults sur : "${selectedPost?.topic||ideaTopic||"comment structurer une stratégie d'inclusion financière nationale"}".
Format : 
Post 1/5 : Accroche forte avec problématique
Post 2/5 : Contexte et enjeux
Post 3/5 : Solution / approche recommandée
Post 4/5 : Exemples de réussite terrain
Post 5/5 : Conclusion + CTA + contact IFA Consults
Chaque post : 80-120 mots. Hashtags sur le dernier post.`,
      tribune:`Rédige une tribune d'expert LinkedIn pour IFA Consults sur : "${selectedPost?.topic||ideaTopic||"L'avenir de la finance inclusive en Afrique de l'Ouest à l'horizon 2030"}".
Structure article long :
- Titre percutant
- Introduction (contexte, enjeux)
- 3 parties avec sous-titres
- Conclusion avec vision d'IFA Consults
- Bio courte de l'auteur (directeur IFA Consults)
- Hashtags
- 450-550 mots`,
    };

    const postType=slot==="monday"?"debut_semaine":slot==="friday"?"bon_weekend":(selectedPost?.type||"actu_sectorielle");

    try{
      const resp=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:MODEL,max_tokens:1200,system:IFA_SYSTEM,messages:[{role:"user",content:prompts[postType]||prompts.actu_sectorielle}]}),
      });
      const data=await resp.json();
      const text=data.content?.filter(b=>b.type==="text").map(b=>b.text).join("")||"";

      // Update calendar
      setCalendar(p=>p.map(w=>{
        if(w.id!==weekId)return w;
        if(slot==="monday")return{...w,monday:{...w.monday,content:text,generated:true}};
        if(slot==="friday")return{...w,friday:{...w.friday,content:text,generated:true}};
        return{...w,midweek:w.midweek.map((m,idx)=>idx===parseInt(slot)?{...m,content:text,generated:true}:m)};
      }));

      // Add to library
      const newItem={id:Date.now(),type:postType,content:text,date:new Date().toISOString().slice(0,10),platform:"LinkedIn",topic:selectedPost?.topic||ideaTopic||"",status:"brouillon"};
      setContentLibrary(p=>[newItem,...p]);
      if(selectedPost)setSelectedPost(prev=>({...prev,content:text,generated:true}));
    }catch(e){console.error(e);}
    setGenerating(null);
  };

  const generateFreeContent=async()=>{
    if(!ideaTopic.trim())return;
    setGeneratingIdea(true);
    await generatePost(0,ideaType,ideaType);
    setGeneratingIdea(false);
  };

  const WeekCard=({week})=>(
    <div style={{background:C.card,border:`1px solid ${selectedWeek?.id===week.id?C.purple+"60":C.border}`,padding:16,marginBottom:12,cursor:"pointer",transition:"border-color 0.2s"}}
      onClick={()=>setSelectedWeek(selectedWeek?.id===week.id?null:week)}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div>
          <div style={{fontFamily:"monospace",fontSize:11,color:C.purple,letterSpacing:"0.08em"}}>{week.weekLabel}</div>
          <div style={{fontSize:12,color:C.muted,marginTop:2}}>{week.dateRange}</div>
        </div>
        <div style={{display:"flex",gap:4}}>
          {[week.monday,...week.midweek,week.friday].map((p,i)=>(
            <div key={i} style={{width:10,height:10,borderRadius:"50%",background:p.generated?C.success:C.border}}/>
          ))}
        </div>
      </div>
      {/* Slots rapides */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {[
          {slot:"monday",post:week.monday,label:"Lun"},
          ...week.midweek.map((m,i)=>({slot:String(i),post:m,label:["Mar","Mer","Jeu"][i]})),
          {slot:"friday",post:week.friday,label:"Ven"},
        ].map(({slot,post,label})=>{
          const ti=getTypeInfo(post.type);
          return(
            <div key={slot} onClick={e=>{e.stopPropagation();setSelectedPost({...post,weekId:week.id,slot});}}
              style={{padding:"6px 10px",background:post.generated?`${ti.color}15`:`${C.border}20`,border:`1px solid ${post.generated?ti.color+"40":C.border}`,fontSize:10,fontFamily:"monospace",cursor:"pointer",color:post.generated?ti.color:C.muted,transition:"all 0.15s"}}>
              {label} {post.generated?"✓":ti.icon}
            </div>
          );
        })}
      </div>
    </div>
  );

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      {/* Sub-tabs */}
      <div style={{borderBottom:`1px solid ${C.border}`,padding:"0 24px",background:C.surface,display:"flex",gap:2,flexShrink:0}}>
        {[
          {id:"calendrier",label:"📅 CALENDRIER ÉDITORIAL",color:C.purple},
          {id:"redaction",label:"✍️ RÉDACTION LIBRE",color:C.pink},
          {id:"bibliotheque",label:`📚 BIBLIOTHÈQUE (${contentLibrary.length})`,color:C.blue},
        ].map(t=>(
          <button key={t.id} onClick={()=>setSubTab(t.id)} style={{padding:"10px 18px",fontFamily:"monospace",fontSize:11,cursor:"pointer",background:subTab===t.id?`${t.color}15`:"transparent",color:subTab===t.id?t.color:C.muted,border:"none",borderBottom:`2px solid ${subTab===t.id?t.color:"transparent"}`,letterSpacing:"0.06em"}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── CALENDRIER ─── */}
      {subTab==="calendrier"&&(
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>
          {/* Left: weeks list */}
          <div style={{width:320,borderRight:`1px solid ${C.border}`,overflowY:"auto",padding:20,flexShrink:0}}>
            <div style={{fontSize:10,color:C.purple,letterSpacing:"0.12em",fontFamily:"monospace",marginBottom:14}}>📅 PLANNING 8 SEMAINES</div>
            {calendar.map(w=><WeekCard key={w.id} week={w}/>)}
          </div>

          {/* Right: post editor */}
          <div style={{flex:1,overflowY:"auto",padding:24}}>
            {!selectedPost?(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",color:C.muted}}>
                <div style={{fontSize:40,marginBottom:16,opacity:0.3}}>📅</div>
                <div style={{fontFamily:"monospace",fontSize:12,letterSpacing:"0.08em",textAlign:"center"}}>Cliquez sur un slot dans le calendrier<br/>pour rédiger ou générer le contenu</div>
              </div>
            ):(
              <div style={{maxWidth:680}} className="fade-up">
                {/* Post header */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
                  <div>
                    {(()=>{const ti=getTypeInfo(selectedPost.type);return(
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                        <span style={{fontSize:20}}>{ti.icon}</span>
                        <Tag color={ti.color}>{ti.label.toUpperCase()}</Tag>
                        <Tag color={C.muted} small>{selectedPost.date}</Tag>
                        <Tag color={C.blue} small>LinkedIn</Tag>
                      </div>
                    );})()}
                    <div style={{fontSize:12,color:C.muted}}>{getTypeInfo(selectedPost.type).desc}</div>
                  </div>
                </div>

                {/* Topic input si pertinent */}
                {!["debut_semaine","bon_weekend"].includes(selectedPost.type)&&(
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em",fontFamily:"monospace",marginBottom:6}}>SUJET / THÈME DU POST</div>
                    <input value={selectedPost.topic||""} onChange={e=>setSelectedPost(p=>({...p,topic:e.target.value}))}
                      placeholder="Ex: digitalisation des IMF au Sénégal, rapport CGAP 2025, inclusion financière des femmes..."
                      style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,color:C.text,padding:"10px 14px",fontFamily:"monospace",fontSize:12,outline:"none"}}/>
                  </div>
                )}

                {/* Platform */}
                <div style={{marginBottom:16,display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{fontSize:10,color:C.muted,fontFamily:"monospace"}}>PLATEFORME :</span>
                  {["LinkedIn","Twitter/X","Facebook","Newsletter"].map(p=>(
                    <button key={p} onClick={()=>setSelectedPost(prev=>({...prev,platform:p}))}
                      style={{padding:"4px 10px",fontSize:10,fontFamily:"monospace",cursor:"pointer",background:selectedPost.platform===p?C.blueDim:"transparent",color:selectedPost.platform===p?C.blue:C.muted,border:`1px solid ${selectedPost.platform===p?C.blue+"50":C.border}`}}>
                      {p}
                    </button>
                  ))}
                </div>

                {/* Generate button */}
                <div style={{marginBottom:16}}>
                  <Btn variant="purple" onClick={()=>generatePost(selectedPost.weekId,selectedPost.slot,selectedPost.type)} disabled={!!generating} style={{fontSize:11}}>
                    {generating===`${selectedPost.weekId}-${selectedPost.slot}`?"⟳ GÉNÉRATION...":selectedPost.generated?"↻ RÉGÉNÉRER":"✦ GÉNÉRER AVEC L'IA"}
                  </Btn>
                </div>

                {/* Content textarea */}
                <div>
                  <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em",fontFamily:"monospace",marginBottom:6}}>CONTENU DU POST</div>
                  <textarea value={selectedPost.content||""} onChange={e=>setSelectedPost(p=>({...p,content:e.target.value}))} rows={12}
                    placeholder="Le contenu généré par l'IA apparaîtra ici. Vous pouvez ensuite l'éditer librement..."
                    style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,color:C.text,padding:"16px",fontFamily:"Georgia,serif",fontSize:14,lineHeight:1.8,resize:"vertical",outline:"none"}}/>
                </div>

                {/* Actions */}
                {selectedPost.content&&(
                  <div style={{marginTop:12,display:"flex",gap:8}}>
                    <button onClick={()=>{
                      navigator.clipboard?.writeText(selectedPost.content);
                      setCalendar(p=>p.map(w=>w.id!==selectedPost.weekId?w:{
                        ...w,
                        monday:selectedPost.slot==="monday"?{...w.monday,content:selectedPost.content,generated:true}:w.monday,
                        friday:selectedPost.slot==="friday"?{...w.friday,content:selectedPost.content,generated:true}:w.friday,
                        midweek:w.midweek.map((m,i)=>String(i)===selectedPost.slot?{...m,content:selectedPost.content,generated:true}:m),
                      }));
                      setContentLibrary(p=>[{id:Date.now(),type:selectedPost.type,content:selectedPost.content,date:selectedPost.date,platform:selectedPost.platform||"LinkedIn",topic:selectedPost.topic||"",status:"prêt"},
                        ...p.filter(x=>!(x.type===selectedPost.type&&x.date===selectedPost.date))]);
                    }} style={{background:C.accentDim,border:`1px solid ${C.accent}40`,color:C.accent,padding:"8px 16px",fontFamily:"monospace",fontSize:10,cursor:"pointer"}}>
                      ✓ VALIDER & COPIER
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── RÉDACTION LIBRE ─── */}
      {subTab==="redaction"&&(
        <div style={{flex:1,overflowY:"auto",padding:28}}>
          <div style={{maxWidth:800,margin:"0 auto"}}>
            <div style={{fontSize:10,color:C.pink,letterSpacing:"0.14em",fontFamily:"monospace",marginBottom:6}}>✍️ PRODUCTION DE CONTENU</div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:400,marginBottom:6,color:C.text}}>Générer du contenu à la demande</h2>
            <p style={{fontSize:13,color:C.muted,marginBottom:28,lineHeight:1.6}}>Sélectionnez un type de contenu, définissez le sujet, et laissez l'IA produire un post professionnel prêt à publier.</p>

            {/* Type selector */}
            <div style={{marginBottom:24}}>
              <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em",fontFamily:"monospace",marginBottom:12}}>TYPE DE CONTENU</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                {CONTENT_TYPES.map(t=>(
                  <div key={t.id} onClick={()=>setIdeaType(t.id)}
                    style={{padding:"12px 14px",background:ideaType===t.id?`${t.color}15`:C.card,border:`1px solid ${ideaType===t.id?t.color+"50":C.border}`,cursor:"pointer",transition:"all 0.2s"}}>
                    <div style={{fontSize:20,marginBottom:6}}>{t.icon}</div>
                    <div style={{fontSize:11,color:ideaType===t.id?t.color:C.text,fontFamily:"monospace",marginBottom:3}}>{t.label}</div>
                    <div style={{fontSize:10,color:C.muted,lineHeight:1.4}}>{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Topic */}
            <div style={{marginBottom:20}}>
              <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em",fontFamily:"monospace",marginBottom:8}}>SUJET OU THÈME</div>
              <input value={ideaTopic} onChange={e=>setIdeaTopic(e.target.value)}
                placeholder="Ex: La digitalisation des IMF en Côte d'Ivoire — rapport AFD 2025, Impact du Mobile Money sur l'épargne rurale..."
                style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,color:C.text,padding:"12px 16px",fontFamily:"monospace",fontSize:13,outline:"none",marginBottom:12}}/>
              {/* Suggestions de sujets */}
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {["Inclusion financière des femmes en Afrique","Rapport CGAP 2025","Mobile Money et épargne rurale","Réglementation fintech UEMOA","IMF et finance verte","Microassurance agricole","PME et accès au crédit","Blended finance pour le développement"].map(s=>(
                  <button key={s} onClick={()=>setIdeaTopic(s)} style={{padding:"3px 10px",background:`${C.pink}12`,border:`1px solid ${C.pink}30`,color:C.muted,fontSize:10,fontFamily:"monospace",cursor:"pointer",borderRadius:2}}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <Btn variant="pink" onClick={generateFreeContent} disabled={generatingIdea||!ideaTopic.trim()}>
              {generatingIdea?"⟳ GÉNÉRATION EN COURS...":"✦ GÉNÉRER LE CONTENU"}
            </Btn>

            {/* Résultat */}
            {contentLibrary.length>0&&contentLibrary[0]&&(
              <div style={{marginTop:28,animation:"fadeUp 0.3s ease"}}>
                <div style={{fontSize:9,color:C.pink,letterSpacing:"0.1em",fontFamily:"monospace",marginBottom:10}}>DERNIER CONTENU GÉNÉRÉ</div>
                <div style={{background:C.card,border:`1px solid ${C.pink}40`,padding:24}}>
                  <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
                    {(()=>{const ti=getTypeInfo(contentLibrary[0].type);return<Tag color={ti.color}>{ti.icon} {ti.label}</Tag>;}())}
                    {contentLibrary[0].topic&&<Tag color={C.muted} small>{contentLibrary[0].topic.slice(0,40)}</Tag>}
                  </div>
                  <div style={{fontFamily:"Georgia,serif",fontSize:14,color:C.text,lineHeight:1.85,whiteSpace:"pre-wrap"}}>{contentLibrary[0].content}</div>
                  <div style={{marginTop:16,display:"flex",gap:8}}>
                    <button onClick={()=>navigator.clipboard?.writeText(contentLibrary[0].content)} style={{background:C.accentDim,border:`1px solid ${C.accent}40`,color:C.accent,padding:"8px 14px",fontFamily:"monospace",fontSize:10,cursor:"pointer"}}>📋 COPIER</button>
                    <button onClick={()=>setContentLibrary(p=>p.map((c,i)=>i===0?{...c,status:"publié"}:c))} style={{background:C.successDim||C.accentDim,border:`1px solid ${C.success}40`,color:C.success,padding:"8px 14px",fontFamily:"monospace",fontSize:10,cursor:"pointer"}}>✓ MARQUER PUBLIÉ</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── BIBLIOTHÈQUE ─── */}
      {subTab==="bibliotheque"&&(
        <div style={{flex:1,overflowY:"auto",padding:28}}>
          <div style={{maxWidth:800,margin:"0 auto"}}>
            <div style={{fontSize:10,color:C.blue,letterSpacing:"0.14em",fontFamily:"monospace",marginBottom:6}}>📚 BIBLIOTHÈQUE DE CONTENUS</div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:400,marginBottom:20,color:C.text}}>Tous vos contenus générés</h2>
            {contentLibrary.length===0?(
              <div style={{textAlign:"center",padding:60,color:C.muted}}>
                <div style={{fontSize:36,marginBottom:12,opacity:0.3}}>📚</div>
                <div style={{fontFamily:"monospace",fontSize:12}}>Aucun contenu généré pour l'instant</div>
                <div style={{fontSize:11,marginTop:6}}>Utilisez le calendrier ou la rédaction libre</div>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {contentLibrary.map((c,i)=>{
                  const ti=getTypeInfo(c.type);
                  return(
                    <div key={c.id||i} style={{background:C.card,border:`1px solid ${C.border}`,padding:16}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          <Tag color={ti.color}>{ti.icon} {ti.label}</Tag>
                          {c.platform&&<Tag color={C.blue} small>{c.platform}</Tag>}
                          {c.status&&<Tag color={c.status==="publié"?C.success:c.status==="prêt"?C.accent:C.muted} small>{c.status.toUpperCase()}</Tag>}
                          <Tag color={C.muted} small>{c.date}</Tag>
                        </div>
                        <button onClick={()=>setContentLibrary(p=>p.filter((_,j)=>j!==i))} style={{background:"transparent",border:"none",color:C.danger,cursor:"pointer",fontSize:14}}>✕</button>
                      </div>
                      {c.topic&&<div style={{fontSize:11,color:C.muted,fontFamily:"monospace",marginBottom:8}}>📌 {c.topic}</div>}
                      <div style={{fontSize:13,color:C.text,lineHeight:1.7,whiteSpace:"pre-wrap",maxHeight:100,overflow:"hidden",position:"relative"}}>
                        {c.content.slice(0,280)}{c.content.length>280?"…":""}
                      </div>
                      <div style={{marginTop:10,display:"flex",gap:6}}>
                        <button onClick={()=>navigator.clipboard?.writeText(c.content)} style={{background:C.accentDim,border:`1px solid ${C.accent}40`,color:C.accent,padding:"6px 12px",fontFamily:"monospace",fontSize:9,cursor:"pointer"}}>📋 COPIER</button>
                        <button onClick={()=>setContentLibrary(p=>p.map((x,j)=>j===i?{...x,status:"publié"}:x))} style={{background:`${C.success}10`,border:`1px solid ${C.success}40`,color:C.success,padding:"6px 12px",fontFamily:"monospace",fontSize:9,cursor:"pointer"}}>✓ PUBLIÉ</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// ASSISTANT IA
// ══════════════════════════════════════════
function AssistantModule(){
  const [history,setHistory]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const endRef=useRef(null);
  useEffect(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),[history,loading]);

  const send=async()=>{
    if(!input.trim()||loading)return;
    const msg=input.trim();
    const newH=[...history,{role:"user",content:msg}];
    setHistory(newH);setInput("");setLoading(true);
    try{
      const resp=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:MODEL,max_tokens:1500,system:IFA_SYSTEM,tools:[{type:"web_search_20250305",name:"web_search"}],messages:newH}),
      });
      const data=await resp.json();
      const reply=data.content?.filter(b=>b.type==="text").map(b=>b.text).join("")||"Erreur.";
      setHistory([...newH,{role:"assistant",content:reply}]);
    }catch{setHistory([...history,{role:"assistant",content:"Erreur de connexion."}]);}
    setLoading(false);
  };

  const SUGG=["Quels AO PNUD sont ouverts en Afrique de l'Ouest en ce moment ?","Comment structurer une méthodologie d'évaluation d'impact pour une IMF ?","Quelles tendances de la fintech africaine en 2025-2026 ?","Aide-moi à rédiger un paragraphe de présentation d'IFA Consults","Quels sont les critères de sélection habituels de la Banque Mondiale ?","Trouve des données récentes sur l'inclusion financière en UEMOA"];

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{padding:"14px 24px",borderBottom:`1px solid ${C.border}`,background:C.surface,flexShrink:0}}>
        <div style={{fontSize:10,color:C.accent,letterSpacing:"0.12em",fontFamily:"monospace"}}>◆ ASSISTANT STRATÉGIQUE · RECHERCHE WEB ACTIVE</div>
        <div style={{fontSize:12,color:C.muted,marginTop:2}}>Expert en inclusion financière Afrique · Accès aux données en temps réel</div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:24,display:"flex",flexDirection:"column",gap:14}}>
        {history.length===0&&(
          <div>
            <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em",fontFamily:"monospace",marginBottom:10}}>SUGGESTIONS</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {SUGG.map((s,i)=>(
                <div key={i} onClick={()=>setInput(s)} style={{padding:"12px 14px",background:C.card,border:`1px solid ${C.border}`,fontSize:12,color:C.muted,cursor:"pointer",lineHeight:1.5,transition:"all 0.15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.text;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>
                  → {s}
                </div>
              ))}
            </div>
          </div>
        )}
        {history.map((m,i)=>(
          <div key={i} style={{display:"flex",flexDirection:"column",alignItems:m.role==="user"?"flex-end":"flex-start",animation:"fadeUp 0.3s ease"}}>
            <div style={{fontSize:9,color:C.muted,fontFamily:"monospace",marginBottom:3}}>{m.role==="user"?"VOUS":"◆ IFA ASSISTANT"}</div>
            <div style={{maxWidth:"82%",padding:"12px 16px",fontSize:13,lineHeight:1.75,background:m.role==="user"?C.accentDim:C.card,border:`1px solid ${m.role==="user"?C.accent+"40":C.border}`,color:C.text,whiteSpace:"pre-wrap"}}>
              {m.content}
            </div>
          </div>
        ))}
        {loading&&<div style={{display:"flex",flexDirection:"column",alignItems:"flex-start"}}><div style={{fontSize:9,color:C.muted,fontFamily:"monospace",marginBottom:3}}>◆ IFA ASSISTANT</div><div style={{padding:"12px 16px",background:C.card,border:`1px solid ${C.border}`}}><Loader text="Recherche et rédaction"/></div></div>}
        <div ref={endRef}/>
      </div>
      <div style={{padding:"14px 24px",borderTop:`1px solid ${C.border}`,background:C.surface,display:"flex",gap:10,flexShrink:0}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
          placeholder="Posez votre question ou demandez une rédaction..."
          style={{flex:1,background:C.card,border:`1px solid ${C.border}`,color:C.text,padding:"11px 16px",fontFamily:"monospace",fontSize:13,outline:"none"}}/>
        <Btn onClick={send} disabled={loading||!input.trim()}>ENVOYER</Btn>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// APP PRINCIPALE
// ══════════════════════════════════════════
export default function IFAPlatform(){
  const [tab,setTab]=useState("veille");
  const [pipeline,setPipeline]=useState(INITIAL_PIPELINE);
  const [activeOffer,setActiveOffer]=useState(null);

  const openOffer=(opp)=>{setActiveOffer(opp);setTab("offre");};
  const addToPipeline=(opp)=>{
    const exists=pipeline.find(o=>o.title===opp.title);
    if(!exists){
      setPipeline(p=>[...p,{
        id:Date.now(),title:opp.title,bailleur:opp.bailleur||"",pays:opp.pays||"",
        type:opp.type||"",budget:opp.budget||"",deadline:opp.deadline||"",score:opp.score||null,
        status:"qualification",priority:opp.score>=80?"haute":"normale",
        notes:"",dateAdded:new Date().toISOString().slice(0,10),tdr:opp.description||"",
        source:opp.source||"",sourceUrl:opp.sourceUrl||"",tdrUrl:opp.tdrUrl||"",
      }]);
    }
    setTab("pipeline");
  };

  const urgents=pipeline.filter(o=>{
    if(!o.deadline)return false;
    const d=new Date(o.deadline);if(isNaN(d))return false;
    const days=Math.ceil((d-new Date())/86400000);
    return days<=7&&days>=0&&!["gagne","perdu"].includes(o.status);
  }).length;
  const enRedaction=pipeline.filter(o=>o.status==="redaction").length;

  const TABS=[
    {id:"veille",label:"◎ VEILLE",color:C.accent},
    {id:"pipeline",label:`◈ PIPELINE${pipeline.length>0?` (${pipeline.length})`:""}`,color:C.gold},
    {id:"offre",label:"✦ OFFRE",color:C.gold},
    {id:"comm",label:"📱 COMMUNICATION",color:C.purple},
    {id:"assistant",label:"◆ ASSISTANT",color:C.blue},
  ];

  return(
    <div style={{fontFamily:"'IBM Plex Mono','Courier New',monospace",background:C.bg,minHeight:"100vh",color:C.text,display:"flex",flexDirection:"column"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
        *{box-sizing:border-box;margin:0;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:${C.bg};}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}
        @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.3;}}
        .fade-up{animation:fadeUp 0.35s ease both;}
        textarea,input,select{color-scheme:dark;}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
        a{cursor:pointer;}
      `}</style>

      {/* TOP BAR */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"0 20px",display:"flex",alignItems:"center",height:52,flexShrink:0,gap:0}}>
        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginRight:20,flexShrink:0}}>
          <div style={{width:30,height:30,background:`linear-gradient(135deg,${C.accent},#008f6a)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:9,fontWeight:700,color:"#0d1117",letterSpacing:"-0.02em"}}>IFA</span>
          </div>
          <div>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.1em",color:C.text,lineHeight:1}}>INCLUSIVE FINANCE ACCELERATORS</div>
            <div style={{fontSize:8,color:C.accent,letterSpacing:"0.1em",marginTop:1}}>INTELLIGENCE PLATFORM · AI POWERED</div>
          </div>
        </div>
        <div style={{width:1,height:28,background:C.border,marginRight:16,flexShrink:0}}/>
        {/* Tabs */}
        <div style={{display:"flex",gap:0,flex:1,overflowX:"auto"}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"10px 16px",fontFamily:"monospace",fontSize:10,cursor:"pointer",background:tab===t.id?`${t.color}15`:"transparent",color:tab===t.id?t.color:C.muted,border:"none",borderBottom:`2px solid ${tab===t.id?t.color:"transparent"}`,letterSpacing:"0.06em",transition:"all 0.15s",whiteSpace:"nowrap"}}>
              {t.label}
            </button>
          ))}
        </div>
        {/* Alerts */}
        <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
          {urgents>0&&<Tag color={C.danger}>🔴 J-7: {urgents}</Tag>}
          {enRedaction>0&&<Tag color={C.gold}>✦ {enRedaction} rédaction</Tag>}
          <div style={{width:6,height:6,borderRadius:"50%",background:C.accent,animation:"pulse 2.5s infinite"}}/>
        </div>
      </div>

      {/* CONTENU */}
      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        {tab==="veille"&&<div style={{flex:1,overflowY:"auto"}}><VeilleModule onAddToPipeline={addToPipeline}/></div>}
        {tab==="pipeline"&&<div style={{flex:1,overflowY:"auto"}}><PipelineModule pipeline={pipeline} setPipeline={setPipeline} onOpenOffer={openOffer}/></div>}
        {tab==="offre"&&(
          activeOffer
            ?<OfferModule opp={activeOffer} onBack={()=>setTab("pipeline")}/>
            :<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",color:C.muted}}>
              <div style={{fontSize:40,marginBottom:16,opacity:0.3}}>✦</div>
              <div style={{fontFamily:"monospace",fontSize:12,marginBottom:20}}>Sélectionnez une opportunité dans le pipeline</div>
              <Btn variant="gold" onClick={()=>setTab("pipeline")}>ALLER AU PIPELINE</Btn>
            </div>
        )}
        {tab==="comm"&&<div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}><CommModule/></div>}
        {tab==="assistant"&&<div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}><AssistantModule/></div>}
      </div>
    </div>
  );
}
