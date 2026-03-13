import { AgentStatus, AgentAnimation } from "@/types/agent";

interface Props {
  id: string;
  color: string;
  isBlinking: boolean;
  status: AgentStatus;
  animation: AgentAnimation;
}

const S = `
  @keyframes float      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
  @keyframes floatSlow  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
  @keyframes blink      { 0%,90%,100%{transform:scaleY(1)} 95%{transform:scaleY(0.1)} }
  @keyframes bob        { 0%,100%{transform:translateY(0) rotate(0)} 25%{transform:translateY(-3px) rotate(-2deg)} 75%{transform:translateY(-3px) rotate(2deg)} }
  @keyframes legL       { 0%,100%{transform:rotate(-18deg)} 50%{transform:rotate(18deg)} }
  @keyframes legR       { 0%,100%{transform:rotate(18deg)} 50%{transform:rotate(-18deg)} }
  @keyframes armL       { 0%,100%{transform:rotate(18deg)} 50%{transform:rotate(-18deg)} }
  @keyframes armR       { 0%,100%{transform:rotate(-18deg)} 50%{transform:rotate(18deg)} }
  @keyframes typeBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
  @keyframes think1     { 0%,60%,100%{opacity:0.2} 20%{opacity:1} }
  @keyframes think2     { 0%,60%,100%{opacity:0.2} 35%{opacity:1} }
  @keyframes think3     { 0%,60%,100%{opacity:0.2} 50%{opacity:1} }
  @keyframes pulse      { 0%,100%{opacity:0.4} 50%{opacity:1} }
  @keyframes scan       { 0%{transform:translateY(-14px);opacity:0.9} 100%{transform:translateY(14px);opacity:0.3} }
  @keyframes radar      { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
  @keyframes wave       { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(1.8)} }
  @keyframes eyeShift   { 0%,80%,100%{transform:translateX(0)} 85%{transform:translateX(1.5px)} 90%{transform:translateX(-1.5px)} }
  @keyframes drink      { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(-35deg) translateY(-2px)} }
  @keyframes flicker    { 0%,100%{opacity:1} 92%{opacity:1} 94%{opacity:0.3} 96%{opacity:1} }
  @keyframes particle   { 0%{transform:translateY(0);opacity:0.8} 100%{transform:translateY(-12px);opacity:0} }
  @keyframes ariaFloat  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
  @keyframes ariaCore   { 0%,100%{r:4;opacity:0.9} 50%{r:6;opacity:0.5} }
  @keyframes ariaRing   { 0%{transform:rotateX(70deg) rotate(0deg)} 100%{transform:rotateX(70deg) rotate(360deg)} }
  @keyframes ariaOrbit1 { 0%{transform:rotate(0deg) translateX(22px) rotate(0deg)} 100%{transform:rotate(360deg) translateX(22px) rotate(-360deg)} }
  @keyframes ariaOrbit2 { 0%{transform:rotate(120deg) translateX(22px) rotate(-120deg)} 100%{transform:rotate(480deg) translateX(22px) rotate(-480deg)} }
  @keyframes ariaOrbit3 { 0%{transform:rotate(240deg) translateX(22px) rotate(-240deg)} 100%{transform:rotate(600deg) translateX(22px) rotate(-600deg)} }
  @keyframes ariaScan   { 0%{transform:translateY(-20px);opacity:0} 10%{opacity:0.6} 90%{opacity:0.6} 100%{transform:translateY(84px);opacity:0} }
  @keyframes ariaBase   { 0%,100%{opacity:0.3;transform:scaleX(1)} 50%{opacity:0.6;transform:scaleX(1.15)} }
  @keyframes ariaRec    { 0%,100%{opacity:1} 50%{opacity:0.2} }
`;

type SP = Omit<Props, "id" | "isBlinking">;

function ScoutSprite({ color, animation, status }: SP) {
  const typing=animation==="typing", thinking=animation==="thinking", walking=animation==="walking", talking=animation==="talking";
  const active=!["idle","done"].includes(status);
  return (
    <svg viewBox="0 0 64 72" width="64" height="72" xmlns="http://www.w3.org/2000/svg">
      <style>{S}</style>
      <ellipse cx="32" cy="68" rx="10" ry="3" fill="#000" opacity="0.25"/>
      <g style={{animation:walking?"bob .5s ease-in-out infinite":"float 3s ease-in-out infinite",transformOrigin:"32px 38px"}}>
        {active&&<ellipse cx="32" cy="38" rx="22" ry="7" fill="none" stroke={color} strokeWidth="1.2" strokeOpacity="0.5" strokeDasharray="4 3" style={{animation:"radar 2s linear infinite",transformOrigin:"32px 38px"}}/>}
        <circle cx="32" cy="38" r="16" fill="#0a1a2a" stroke={color} strokeWidth="1.5" strokeOpacity="0.8"/>
        <circle cx="32" cy="38" r="14" fill={color} fillOpacity="0.08"/>
        <circle cx="27" cy="33" r="5" fill={color} fillOpacity="0.15"/>
        {active&&<rect x="18" y="36" width="28" height="1.5" fill={color} opacity="0.6" clipPath="circle(14px at 32px 38px)" style={{animation:"scan 1.8s linear infinite",transformOrigin:"32px 38px"}}/>}
        <g style={{animation:"blink 4s ease-in-out infinite",transformOrigin:"32px 37px"}}>
          <ellipse cx="32" cy="37" rx="8" ry="6" fill="#000" stroke={color} strokeWidth="1" strokeOpacity="0.6"/>
          <circle cx="32" cy="37" r="4" fill={color} fillOpacity="0.9"/>
          <circle cx="32" cy="37" r="2.5" fill="#fff" fillOpacity="0.2"/>
          <circle cx="30" cy="35.5" r="1" fill="#fff" fillOpacity="0.5"/>
          <circle cx="32" cy="37" r="6" fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.4" strokeDasharray="2 2"/>
        </g>
        <line x1="16" y1="33" x2="10" y2="27" stroke={color} strokeWidth="1.2" strokeOpacity="0.6"/>
        <circle cx="10" cy="27" r="2" fill={color} fillOpacity="0.8" style={{animation:active?"pulse 1.2s ease-in-out infinite":"none"}}/>
        <line x1="48" y1="33" x2="54" y2="27" stroke={color} strokeWidth="1.2" strokeOpacity="0.6"/>
        <circle cx="54" cy="27" r="2" fill={color} fillOpacity="0.8" style={{animation:active?"pulse 1.2s ease-in-out infinite .4s":"none"}}/>
        <g style={{animation:walking?"legL .5s ease-in-out infinite":"none",transformOrigin:"26px 52px"}}>
          <rect x="24" y="52" width="5" height="9" rx="2" fill="#0d2030" stroke={color} strokeWidth="0.8" strokeOpacity="0.5"/>
          <rect x="22" y="59" width="8" height="3" rx="1.5" fill={color} fillOpacity="0.7"/>
        </g>
        <g style={{animation:walking?"legR .5s ease-in-out infinite":"none",transformOrigin:"38px 52px"}}>
          <rect x="35" y="52" width="5" height="9" rx="2" fill="#0d2030" stroke={color} strokeWidth="0.8" strokeOpacity="0.5"/>
          <rect x="34" y="59" width="8" height="3" rx="1.5" fill={color} fillOpacity="0.7"/>
        </g>
        {typing&&<><g style={{animation:"typeBounce .18s ease-in-out infinite",transformOrigin:"20px 48px"}}><rect x="16" y="45" width="8" height="5" rx="2" fill={color} fillOpacity="0.9"/><rect x="17" y="47" width="2" height="2" rx="0.5" fill="#000" opacity="0.5"/><rect x="20" y="47" width="2" height="2" rx="0.5" fill="#000" opacity="0.5"/></g><g style={{animation:"typeBounce .22s ease-in-out infinite .09s",transformOrigin:"44px 48px"}}><rect x="40" y="45" width="8" height="5" rx="2" fill={color} fillOpacity="0.9"/><rect x="41" y="47" width="2" height="2" rx="0.5" fill="#000" opacity="0.5"/><rect x="44" y="47" width="2" height="2" rx="0.5" fill="#000" opacity="0.5"/></g><circle cx="32" cy="22" r="1.5" fill={color} style={{animation:"particle 1s ease-out infinite"}}/><circle cx="28" cy="24" r="1" fill={color} style={{animation:"particle 1s ease-out infinite .3s"}}/><circle cx="36" cy="23" r="1" fill={color} style={{animation:"particle 1s ease-out infinite .6s"}}/></>}
        {thinking&&<><circle cx="42" cy="24" r="3" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="0.8" style={{animation:"think1 1.2s ease-in-out infinite"}}/><circle cx="48" cy="18" r="4" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="0.8" style={{animation:"think2 1.2s ease-in-out infinite"}}/><circle cx="55" cy="13" r="5.5" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1" style={{animation:"think3 1.2s ease-in-out infinite"}}/><text x="55" y="16.5" textAnchor="middle" fontSize="6" fill={color} fillOpacity="0.9" fontFamily="monospace">?</text></>}
        {talking&&[0,4,8].map((o,i)=><rect key={i} x={51+o} y="34" width="2" height="8" rx="1" fill={color} fillOpacity="0.7" style={{animation:`wave .5s ease-in-out infinite ${i*.12}s`,transformOrigin:`${52+o}px 38px`}}/>)}
      </g>
    </svg>
  );
}

function ApexSprite({ color, animation, status }: SP) {
  const typing=animation==="typing", thinking=animation==="thinking", walking=animation==="walking", drinking=animation==="drinking", talking=animation==="talking";
  const active=!["idle","done"].includes(status);
  return (
    <svg viewBox="0 0 64 72" width="64" height="72" xmlns="http://www.w3.org/2000/svg">
      <style>{S}</style>
      <ellipse cx="32" cy="68" rx="11" ry="3.5" fill="#000" opacity="0.25"/>
      <g style={{animation:walking?"bob .5s ease-in-out infinite":"floatSlow 3.5s ease-in-out infinite",transformOrigin:"32px 36px"}}>
        <rect x="16" y="8" width="32" height="26" rx="4" fill="#0d1f10" stroke={color} strokeWidth="1.2" strokeOpacity="0.7"/>
        <rect x="19" y="11" width="26" height="20" rx="2" fill="#061208" style={{animation:active?"flicker 8s ease-in-out infinite":"none"}}/>
        <g style={{animation:"blink 5s ease-in-out infinite",transformOrigin:"32px 22px"}}>
          <rect x="21" y="17" width="8" height="7" rx="1.5" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="0.8"/>
          <rect x="35" y="17" width="8" height="7" rx="1.5" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="0.8"/>
          <rect x={typing?"23":"22"} y="18" width="4" height="5" rx="1" fill={color} fillOpacity="0.9"/>
          <rect x={typing?"37":"36"} y="18" width="4" height="5" rx="1" fill={color} fillOpacity="0.9"/>
          <rect x="23" y="18" width="1.5" height="1.5" rx="0.5" fill="#fff" fillOpacity="0.5"/>
          <rect x="37" y="18" width="1.5" height="1.5" rx="0.5" fill="#fff" fillOpacity="0.5"/>
        </g>
        {active?<rect x="21" y="27" width={typing?"14":"10"} height="1.5" rx="0.8" fill={color} fillOpacity="0.8"/>:<rect x="21" y="27" width="22" height="1.5" rx="0.8" fill="#333"/>}
        <circle cx="42" cy="12" r="1.5" fill={active?color:"#333"} fillOpacity="0.9" style={{animation:active?"pulse .8s ease-in-out infinite":"none"}}/>
        <circle cx="46" cy="12" r="1.5" fill={active?"#ffaa00":"#333"} fillOpacity="0.8" style={{animation:active?"pulse .8s ease-in-out infinite .3s":"none"}}/>
        <rect x="18" y="34" width="28" height="18" rx="3" fill="#0d1f10" stroke={color} strokeWidth="1" strokeOpacity="0.5"/>
        <rect x="22" y="37" width="20" height="10" rx="1.5" fill="#061208" stroke={color} strokeWidth="0.5" strokeOpacity="0.3"/>
        {[0,1,2].map(i=><rect key={i} x={24+i*6} y="39" width="4" height={active?3+i:1} rx="0.5" fill={i===0?color:i===1?"#ffaa00":"#ff4466"} fillOpacity="0.8" style={{animation:active?`pulse ${.6+i*.2}s ease-in-out infinite ${i*.15}s`:"none"}}/>)}
        <g style={{animation:walking?"armL .5s ease-in-out infinite":drinking?"drink 1.5s ease-in-out infinite":"none",transformOrigin:"18px 38px"}}>
          <rect x="10" y="35" width="8" height="14" rx="3" fill="#0d1f10" stroke={color} strokeWidth="0.8" strokeOpacity="0.5"/>
          {typing?<g style={{animation:"typeBounce .15s ease-in-out infinite",transformOrigin:"14px 50px"}}><rect x="10" y="49" width="8" height="5" rx="2" fill={color} fillOpacity="0.9"/><rect x="11" y="51" width="2" height="1.5" rx="0.5" fill="#000" opacity="0.6"/><rect x="14" y="51" width="2" height="1.5" rx="0.5" fill="#000" opacity="0.6"/></g>:<rect x="11" y="49" width="7" height="5" rx="2" fill="#0d2815" stroke={color} strokeWidth="0.8" strokeOpacity="0.5"/>}
        </g>
        <g style={{animation:walking?"armR .5s ease-in-out infinite":"none",transformOrigin:"46px 38px"}}>
          <rect x="46" y="35" width="8" height="14" rx="3" fill="#0d1f10" stroke={color} strokeWidth="0.8" strokeOpacity="0.5"/>
          {drinking?<g style={{animation:"drink 1.5s ease-in-out infinite",transformOrigin:"50px 50px"}}><rect x="46" y="46" width="8" height="9" rx="2" fill="#fff" stroke="#ccc" strokeWidth="0.8"/><rect x="48" y="43" width="4" height="5" rx="1" fill="#c8906a" opacity="0.8"/><path d="M54 48 Q58 48 58 52 Q58 56 54 56" fill="none" stroke="#ccc" strokeWidth="1"/><path d="M49 43 Q49 40 50 38 Q51 36 50 34" fill="none" stroke="#888" strokeWidth="0.8" strokeOpacity="0.5" style={{animation:"particle 1.5s ease-out infinite"}}/></g>:typing?<g style={{animation:"typeBounce .2s ease-in-out infinite .07s",transformOrigin:"50px 50px"}}><rect x="46" y="49" width="8" height="5" rx="2" fill={color} fillOpacity="0.9"/><rect x="47" y="51" width="2" height="1.5" rx="0.5" fill="#000" opacity="0.6"/><rect x="50" y="51" width="2" height="1.5" rx="0.5" fill="#000" opacity="0.6"/></g>:<rect x="46" y="49" width="7" height="5" rx="2" fill="#0d2815" stroke={color} strokeWidth="0.8" strokeOpacity="0.5"/>}
        </g>
        <g style={{animation:walking?"legL .5s ease-in-out infinite":"none",transformOrigin:"25px 52px"}}><rect x="20" y="52" width="10" height="12" rx="3" fill="#0d1f10" stroke={color} strokeWidth="0.8" strokeOpacity="0.5"/><rect x="19" y="62" width="12" height="4" rx="2" fill={color} fillOpacity="0.6"/></g>
        <g style={{animation:walking?"legR .5s ease-in-out infinite":"none",transformOrigin:"39px 52px"}}><rect x="34" y="52" width="10" height="12" rx="3" fill="#0d1f10" stroke={color} strokeWidth="0.8" strokeOpacity="0.5"/><rect x="33" y="62" width="12" height="4" rx="2" fill={color} fillOpacity="0.6"/></g>
        {thinking&&<><circle cx="44" cy="8" r="3" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="0.8" style={{animation:"think1 1.2s ease-in-out infinite"}}/><circle cx="50" cy="3" r="4" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="0.8" style={{animation:"think2 1.2s ease-in-out infinite"}}/><circle cx="57" cy="-1" r="5" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1" style={{animation:"think3 1.2s ease-in-out infinite"}}/><text x="57" y="2" textAnchor="middle" fontSize="6" fill={color} fillOpacity="0.9" fontFamily="monospace">?</text></>}
        {talking&&[0,5,10].map((o,i)=><rect key={i} x={52+o} y="32" width="2.5" height="8" rx="1.2" fill={color} fillOpacity="0.7" style={{animation:`wave .45s ease-in-out infinite ${i*.1}s`,transformOrigin:`${53.5+o}px 36px`}}/>)}
      </g>
    </svg>
  );
}

function VeraSprite({ color, animation, status }: SP) {
  const typing=animation==="typing", thinking=animation==="thinking", walking=animation==="walking", talking=animation==="talking";
  const active=!["idle","done"].includes(status);
  return (
    <svg viewBox="0 0 64 72" width="64" height="72" xmlns="http://www.w3.org/2000/svg">
      <style>{S}</style>
      <ellipse cx="32" cy="69" rx="9" ry="2.8" fill="#000" opacity="0.22"/>
      <g style={{animation:walking?"bob .5s ease-in-out infinite":"float 3.2s ease-in-out infinite",transformOrigin:"32px 36px"}}>
        <rect x="20" y="5" width="24" height="26" rx="6" fill="#1a1005" stroke={color} strokeWidth="1.2" strokeOpacity="0.7"/>
        <rect x="19" y="13" width="26" height="7" rx="1" fill={color} fillOpacity="0.12" stroke={color} strokeWidth="0.8" strokeOpacity="0.6"/>
        <g style={{animation:"blink 4.5s ease-in-out infinite",transformOrigin:"32px 16.5px"}}>
          {[22,25,28].map((x,i)=><rect key={i} x={x} y="14" width="2" height={active?[5,4,5][i]:[3,2,3][i]} rx="0.5" fill={color} fillOpacity={[0.9,0.7,0.9][i]} style={{animation:active?`pulse ${.6+i*.05}s ease-in-out infinite ${i*.1}s`:"none"}}/>)}
          {[34,37,40].map((x,i)=><rect key={i} x={x} y={i===0?"15":"14"} width="2" height={active?[4,5,3][i]:[2,3,1][i]} rx="0.5" fill={color} fillOpacity={[0.7,0.9,0.6][i]} style={{animation:active?`pulse ${.7+i*.05}s ease-in-out infinite ${i*.15}s`:"none"}}/>)}
        </g>
        <circle cx="32" cy="23" r="1.2" fill={color} fillOpacity="0.5"/>
        <rect x="24" y="26" width="16" height="2.5" rx="0.8" fill="#111"/>
        {active&&<><rect x="25" y="26.5" width="3" height="1.5" rx="0.5" fill={color} fillOpacity="0.7"/><rect x="29" y="26" width="2" height="2" rx="0.5" fill={color} fillOpacity="0.9"/><rect x="32" y="26.5" width="4" height="1.5" rx="0.5" fill={color} fillOpacity="0.6"/></>}
        <line x1="28" y1="5" x2="26" y2="0" stroke={color} strokeWidth="0.8" strokeOpacity="0.6"/>
        <circle cx="26" cy="0" r="1.5" fill={color} fillOpacity="0.7" style={{animation:active?"pulse 1s ease-in-out infinite":"none"}}/>
        <line x1="36" y1="5" x2="38" y2="0" stroke={color} strokeWidth="0.8" strokeOpacity="0.6"/>
        <circle cx="38" cy="0" r="1.5" fill={color} fillOpacity="0.7" style={{animation:active?"pulse 1s ease-in-out infinite .5s":"none"}}/>
        <rect x="28" y="31" width="8" height="4" rx="2" fill="#120c00" stroke={color} strokeWidth="0.6" strokeOpacity="0.4"/>
        <rect x="18" y="35" width="28" height="20" rx="4" fill="#1a1005" stroke={color} strokeWidth="1" strokeOpacity="0.5"/>
        {active&&<g><rect x="23" y="38" width="18" height="12" rx="2" fill={color} fillOpacity="0.05" stroke={color} strokeWidth="0.5" strokeOpacity="0.4"/>{[0,1,2,3].map(i=><rect key={i} x={25+i*4} y={44-[4,6,5,7][i]} width="2.5" height={[4,6,5,7][i]} rx="0.5" fill={color} fillOpacity={[.5,.7,.6,.9][i]} style={{animation:`pulse ${.9+i*.1}s ease-in-out infinite ${i*.2}s`}}/>)}</g>}
        <g style={{animation:walking?"armL .5s ease-in-out infinite":"none",transformOrigin:"17px 40px"}}>
          <rect x="11" y="36" width="7" height="15" rx="3" fill="#1a1005" stroke={color} strokeWidth="0.8" strokeOpacity="0.4"/>
          {typing?<g style={{animation:"typeBounce .17s ease-in-out infinite",transformOrigin:"14px 52px"}}><rect x="10" y="50" width="8" height="5" rx="2" fill={color} fillOpacity="0.9"/><rect x="11.5" y="52" width="1.5" height="1.5" rx="0.4" fill="#000" opacity="0.5"/><rect x="14" y="52" width="1.5" height="1.5" rx="0.4" fill="#000" opacity="0.5"/></g>:<rect x="11" y="51" width="7" height="4" rx="2" fill="#120c00" stroke={color} strokeWidth="0.6" strokeOpacity="0.4"/>}
        </g>
        <g style={{animation:walking?"armR .5s ease-in-out infinite":"none",transformOrigin:"47px 40px"}}>
          <rect x="46" y="36" width="7" height="15" rx="3" fill="#1a1005" stroke={color} strokeWidth="0.8" strokeOpacity="0.4"/>
          {typing?<g style={{animation:"typeBounce .2s ease-in-out infinite .085s",transformOrigin:"50px 52px"}}><rect x="46" y="50" width="8" height="5" rx="2" fill={color} fillOpacity="0.9"/><rect x="47.5" y="52" width="1.5" height="1.5" rx="0.4" fill="#000" opacity="0.5"/><rect x="50" y="52" width="1.5" height="1.5" rx="0.4" fill="#000" opacity="0.5"/></g>:<rect x="46" y="51" width="7" height="4" rx="2" fill="#120c00" stroke={color} strokeWidth="0.6" strokeOpacity="0.4"/>}
        </g>
        <g style={{animation:walking?"legL .5s ease-in-out infinite":"none",transformOrigin:"26px 55px"}}><rect x="21" y="55" width="9" height="13" rx="3" fill="#1a1005" stroke={color} strokeWidth="0.8" strokeOpacity="0.4"/><rect x="20" y="66" width="11" height="3.5" rx="2" fill={color} fillOpacity="0.5"/></g>
        <g style={{animation:walking?"legR .5s ease-in-out infinite":"none",transformOrigin:"38px 55px"}}><rect x="34" y="55" width="9" height="13" rx="3" fill="#1a1005" stroke={color} strokeWidth="0.8" strokeOpacity="0.4"/><rect x="33" y="66" width="11" height="3.5" rx="2" fill={color} fillOpacity="0.5"/></g>
        {thinking&&<><circle cx="43" cy="9" r="2.5" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="0.8" style={{animation:"think1 1.2s ease-in-out infinite"}}/><circle cx="49" cy="4" r="3.5" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="0.8" style={{animation:"think2 1.2s ease-in-out infinite"}}/><circle cx="56" cy="0" r="5" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1" style={{animation:"think3 1.2s ease-in-out infinite"}}/><text x="56" y="3" textAnchor="middle" fontSize="6" fill={color} fillOpacity="0.9" fontFamily="monospace">%</text></>}
        {talking&&[0,5,10].map((o,i)=><rect key={i} x={52+o} y="33" width="2.5" height="7" rx="1.2" fill={color} fillOpacity="0.7" style={{animation:`wave .5s ease-in-out infinite ${i*.12}s`,transformOrigin:`${53.5+o}px 36.5px`}}/>)}
      </g>
    </svg>
  );
}

function ZionSprite({ color, animation, status }: SP) {
  const typing=animation==="typing", thinking=animation==="thinking", walking=animation==="walking", talking=animation==="talking";
  const active=!["idle","done"].includes(status);
  return (
    <svg viewBox="0 0 64 72" width="64" height="72" xmlns="http://www.w3.org/2000/svg">
      <style>{S}</style>
      <ellipse cx="32" cy="69" rx="13" ry="4" fill="#000" opacity="0.3"/>
      <g style={{animation:walking?"bob .6s ease-in-out infinite":"float 4s ease-in-out infinite",transformOrigin:"32px 38px"}}>
        <rect x="13" y="6" width="38" height="24" rx="3" fill="#1a0508" stroke={color} strokeWidth="1.5" strokeOpacity="0.7"/>
        <rect x="12" y="14" width="40" height="9" rx="1.5" fill="#000" stroke={color} strokeWidth="1" strokeOpacity="0.8"/>
        <rect x="13" y="15" width="38" height="4" rx="1" fill={color} fillOpacity="0.15"/>
        {active&&<rect x="13" y="15" width="38" height="2" fill={color} fillOpacity="0.5" rx="1" style={{animation:"scan 1.2s linear infinite",transformOrigin:"32px 18.5px"}}/>}
        <rect x="28" y="15.5" width="8" height="5" rx="1" fill={color} fillOpacity="0.6" style={{animation:active?"eyeShift 3s ease-in-out infinite":"none",transformOrigin:"32px 18px"}}/>
        <rect x="30" y="16.5" width="4" height="3" rx="0.8" fill={color} fillOpacity="0.9"/>
        <rect x="8" y="13" width="5" height="12" rx="2" fill="#1a0508" stroke={color} strokeWidth="0.8" strokeOpacity="0.5"/>
        <rect x="9" y="15" width="3" height="2" rx="0.5" fill={color} fillOpacity="0.4"/>
        <rect x="9" y="18" width="3" height="2" rx="0.5" fill={color} fillOpacity="0.3"/>
        <rect x="51" y="13" width="5" height="12" rx="2" fill="#1a0508" stroke={color} strokeWidth="0.8" strokeOpacity="0.5"/>
        <rect x="52" y="15" width="3" height="2" rx="0.5" fill={color} fillOpacity="0.4"/>
        <rect x="52" y="18" width="3" height="2" rx="0.5" fill={color} fillOpacity="0.3"/>
        <circle cx="17" cy="9" r="1.8" fill={active?color:"#333"} fillOpacity="0.9" style={{animation:active?"pulse .7s ease-in-out infinite":"none"}}/>
        <circle cx="47" cy="9" r="1.8" fill={active?color:"#333"} fillOpacity="0.9" style={{animation:active?"pulse .7s ease-in-out infinite .35s":"none"}}/>
        {[0,3,6].map((o,i)=><rect key={i} x={22+o*3} y="25" width="2" height="3.5" rx="0.5" fill={talking?color:"#333"} fillOpacity={talking?"0.8":"0.5"} style={{animation:talking?`wave .4s ease-in-out infinite ${o*.08}s`:"none",transformOrigin:`${23+o*3}px 26.75px`}}/>)}
        <rect x="7" y="30" width="16" height="8" rx="3" fill="#1a0508" stroke={color} strokeWidth="1" strokeOpacity="0.6"/>
        <rect x="41" y="30" width="16" height="8" rx="3" fill="#1a0508" stroke={color} strokeWidth="1" strokeOpacity="0.6"/>
        <rect x="13" y="30" width="38" height="22" rx="4" fill="#1a0508" stroke={color} strokeWidth="1.2" strokeOpacity="0.6"/>
        <rect x="19" y="34" width="26" height="14" rx="2" fill="#0d0205" stroke={color} strokeWidth="0.8" strokeOpacity="0.4"/>
        {active?<g><circle cx="32" cy="41" r="5" fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.4"/><circle cx="32" cy="41" r="3" fill="none" stroke={color} strokeWidth="0.4" strokeOpacity="0.3"/><line x1="32" y1="41" x2="32" y2="36.5" stroke={color} strokeWidth="1" strokeOpacity="0.7" style={{animation:"radar 2s linear infinite",transformOrigin:"32px 41px"}}/><circle cx="34" cy="39" r="1" fill={color} fillOpacity="0.8" style={{animation:"pulse 1s ease-in-out infinite"}}/><circle cx="29" cy="42" r="0.8" fill={color} fillOpacity="0.6" style={{animation:"pulse 1s ease-in-out infinite .4s"}}/></g>:<rect x="21" y="36" width="22" height="10" rx="1" fill="#111"/>}
        <g style={{animation:walking?"armL .6s ease-in-out infinite":"none",transformOrigin:"10px 40px"}}>
          <rect x="7" y="38" width="9" height="16" rx="3" fill="#1a0508" stroke={color} strokeWidth="0.8" strokeOpacity="0.5"/>
          {typing?<g style={{animation:"typeBounce .16s ease-in-out infinite",transformOrigin:"11px 56px"}}><rect x="6" y="53" width="10" height="6" rx="2.5" fill={color} fillOpacity="0.9"/><rect x="7.5" y="55.5" width="2" height="1.5" rx="0.4" fill="#000" opacity="0.5"/><rect x="11" y="55.5" width="2" height="1.5" rx="0.4" fill="#000" opacity="0.5"/></g>:<rect x="7" y="54" width="9" height="5" rx="2.5" fill="#110204" stroke={color} strokeWidth="0.8" strokeOpacity="0.5"/>}
        </g>
        <g style={{animation:walking?"armR .6s ease-in-out infinite":"none",transformOrigin:"54px 40px"}}>
          <rect x="48" y="38" width="9" height="16" rx="3" fill="#1a0508" stroke={color} strokeWidth="0.8" strokeOpacity="0.5"/>
          {typing?<g style={{animation:"typeBounce .2s ease-in-out infinite .08s",transformOrigin:"52px 56px"}}><rect x="48" y="53" width="10" height="6" rx="2.5" fill={color} fillOpacity="0.9"/><rect x="49.5" y="55.5" width="2" height="1.5" rx="0.4" fill="#000" opacity="0.5"/><rect x="53" y="55.5" width="2" height="1.5" rx="0.4" fill="#000" opacity="0.5"/></g>:<rect x="48" y="54" width="9" height="5" rx="2.5" fill="#110204" stroke={color} strokeWidth="0.8" strokeOpacity="0.5"/>}
        </g>
        <g style={{animation:walking?"legL .6s ease-in-out infinite":"none",transformOrigin:"24px 52px"}}><rect x="17" y="52" width="12" height="14" rx="3" fill="#1a0508" stroke={color} strokeWidth="0.8" strokeOpacity="0.5"/><rect x="16" y="64" width="14" height="4.5" rx="2" fill={color} fillOpacity="0.5"/></g>
        <g style={{animation:walking?"legR .6s ease-in-out infinite":"none",transformOrigin:"40px 52px"}}><rect x="35" y="52" width="12" height="14" rx="3" fill="#1a0508" stroke={color} strokeWidth="0.8" strokeOpacity="0.5"/><rect x="34" y="64" width="14" height="4.5" rx="2" fill={color} fillOpacity="0.5"/></g>
        {thinking&&<><circle cx="46" cy="6" r="3" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="0.8" style={{animation:"think1 1.2s ease-in-out infinite"}}/><circle cx="52" cy="1" r="4" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="0.8" style={{animation:"think2 1.2s ease-in-out infinite"}}/><circle cx="59" cy="-3" r="5.5" fill={color} fillOpacity="0.12" stroke={color} strokeWidth="1" style={{animation:"think3 1.2s ease-in-out infinite"}}/><text x="59" y="0" textAnchor="middle" fontSize="6" fill={color} fillOpacity="0.9" fontFamily="monospace">!</text></>}
      </g>
    </svg>
  );
}

function ForgeSprite({ color, animation, status }: SP) {
  const typing=animation==="typing", thinking=animation==="thinking", walking=animation==="walking", talking=animation==="talking";
  const active=!["idle","done"].includes(status);
  return (
    <svg viewBox="0 0 64 72" width="64" height="72" xmlns="http://www.w3.org/2000/svg">
      <style>{S}</style>
      <ellipse cx="32" cy="68" rx="12" ry="3.5" fill="#000" opacity="0.28"/>
      <g style={{animation:walking?"bob .55s ease-in-out infinite":"floatSlow 3.8s ease-in-out infinite",transformOrigin:"32px 37px"}}>
        <rect x="15" y="7" width="34" height="24" rx="4" fill="#1a0e05" stroke={color} strokeWidth="1.3" strokeOpacity="0.7"/>
        <rect x="18" y="10" width="28" height="18" rx="2" fill="#0d0600" style={{animation:active?"flicker 6s ease-in-out infinite":"none"}}/>
        <g style={{animation:"blink 4s ease-in-out infinite",transformOrigin:"32px 19px"}}>
          <rect x="20" y="14" width="10" height="8" rx="2" fill={color} fillOpacity="0.12" stroke={color} strokeWidth="0.8"/>
          <rect x="34" y="14" width="10" height="8" rx="2" fill={color} fillOpacity="0.12" stroke={color} strokeWidth="0.8"/>
          <rect x="22" y="15" width="6" height="6" rx="1" fill={color} fillOpacity="0.85"/>
          <rect x="36" y="15" width="6" height="6" rx="1" fill={color} fillOpacity="0.85"/>
          <rect x="22" y="15" width="2" height="2" rx="0.5" fill="#fff" fillOpacity="0.4"/>
          <rect x="36" y="15" width="2" height="2" rx="0.5" fill="#fff" fillOpacity="0.4"/>
        </g>
        <rect x="20" y="24" width="24" height="3" rx="1" fill="#0d0600" stroke={color} strokeWidth="0.5" strokeOpacity="0.4"/>
        {active&&<rect x="21" y="25" width={typing?"16":"10"} height="1.5" rx="0.5" fill={color} fillOpacity="0.7"/>}
        <circle cx="19" cy="10" r="1.5" fill={active?color:"#333"} style={{animation:active?"pulse .9s ease-in-out infinite":"none"}}/>
        <circle cx="45" cy="10" r="1.5" fill={active?"#ffaa00":"#333"} style={{animation:active?"pulse .9s ease-in-out infinite .45s":"none"}}/>
        <rect x="8" y="28" width="14" height="10" rx="3" fill="#1a0e05" stroke={color} strokeWidth="0.9" strokeOpacity="0.5"/>
        <rect x="42" y="28" width="14" height="10" rx="3" fill="#1a0e05" stroke={color} strokeWidth="0.9" strokeOpacity="0.5"/>
        <rect x="14" y="31" width="36" height="24" rx="4" fill="#1a0e05" stroke={color} strokeWidth="1.1" strokeOpacity="0.6"/>
        <rect x="18" y="35" width="28" height="15" rx="2" fill="#0d0600" stroke={color} strokeWidth="0.6" strokeOpacity="0.3"/>
        {active&&<g>{[0,1,2].map(i=><rect key={i} x={20+i*9} y="38" width="7" height={[8,6,9][i]} rx="1" fill={[color,"#ffaa00","#00ff88"][i]} fillOpacity={[.6,.5,.7][i]} style={{animation:`pulse ${[.7,.9,.6][i]}s ease-in-out infinite ${i*.2}s`}}/>)}<rect x="20" y="47" width="26" height="1.5" rx="0.5" fill={color} fillOpacity="0.3"/></g>}
        <g style={{animation:walking?"armL .55s ease-in-out infinite":"none",transformOrigin:"10px 39px"}}>
          <rect x="6" y="31" width="8" height="16" rx="3" fill="#1a0e05" stroke={color} strokeWidth="0.8" strokeOpacity="0.5"/>
          {typing?<g style={{animation:"typeBounce .16s ease-in-out infinite",transformOrigin:"10px 49px"}}><rect x="5" y="46" width="10" height="6" rx="2.5" fill={color} fillOpacity="0.9"/><rect x="6.5" y="48.5" width="2" height="1.5" rx="0.4" fill="#000" opacity="0.5"/><rect x="10" y="48.5" width="2" height="1.5" rx="0.4" fill="#000" opacity="0.5"/></g>:<rect x="6" y="47" width="9" height="5" rx="2.5" fill="#110a00" stroke={color} strokeWidth="0.7" strokeOpacity="0.5"/>}
        </g>
        <g style={{animation:walking?"armR .55s ease-in-out infinite":"none",transformOrigin:"54px 39px"}}>
          <rect x="50" y="31" width="8" height="16" rx="3" fill="#1a0e05" stroke={color} strokeWidth="0.8" strokeOpacity="0.5"/>
          {typing?<g style={{animation:"typeBounce .2s ease-in-out infinite .08s",transformOrigin:"54px 49px"}}><rect x="49" y="46" width="10" height="6" rx="2.5" fill={color} fillOpacity="0.9"/><rect x="50.5" y="48.5" width="2" height="1.5" rx="0.4" fill="#000" opacity="0.5"/><rect x="54" y="48.5" width="2" height="1.5" rx="0.4" fill="#000" opacity="0.5"/></g>:<rect x="49" y="47" width="9" height="5" rx="2.5" fill="#110a00" stroke={color} strokeWidth="0.7" strokeOpacity="0.5"/>}
        </g>
        <g style={{animation:walking?"legL .55s ease-in-out infinite":"none",transformOrigin:"24px 55px"}}><rect x="18" y="55" width="11" height="13" rx="3" fill="#1a0e05" stroke={color} strokeWidth="0.8" strokeOpacity="0.5"/><rect x="17" y="66" width="13" height="4" rx="2" fill={color} fillOpacity="0.55"/></g>
        <g style={{animation:walking?"legR .55s ease-in-out infinite":"none",transformOrigin:"40px 55px"}}><rect x="35" y="55" width="11" height="13" rx="3" fill="#1a0e05" stroke={color} strokeWidth="0.8" strokeOpacity="0.5"/><rect x="34" y="66" width="13" height="4" rx="2" fill={color} fillOpacity="0.55"/></g>
        {thinking&&<><circle cx="44" cy="7" r="2.5" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="0.8" style={{animation:"think1 1.2s ease-in-out infinite"}}/><circle cx="50" cy="2" r="3.5" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="0.8" style={{animation:"think2 1.2s ease-in-out infinite"}}/><circle cx="57" cy="-2" r="5" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1" style={{animation:"think3 1.2s ease-in-out infinite"}}/><text x="57" y="1" textAnchor="middle" fontSize="6" fill={color} fillOpacity="0.9" fontFamily="monospace">⚙</text></>}
        {talking&&[0,5,10].map((o,i)=><rect key={i} x={52+o} y="31" width="2.5" height="8" rx="1.2" fill={color} fillOpacity="0.7" style={{animation:`wave .45s ease-in-out infinite ${i*.1}s`,transformOrigin:`${53.5+o}px 35px`}}/>)}
      </g>
    </svg>
  );
}

function EchoSprite({ color, animation, status }: SP) {
  const typing=animation==="typing", thinking=animation==="thinking", walking=animation==="walking", talking=animation==="talking";
  const active=!["idle","done"].includes(status);
  return (
    <svg viewBox="0 0 64 72" width="64" height="72" xmlns="http://www.w3.org/2000/svg">
      <style>{S}</style>
      <ellipse cx="32" cy="68" rx="9" ry="2.8" fill="#000" opacity="0.22"/>
      <g style={{animation:walking?"bob .5s ease-in-out infinite":"float 3.4s ease-in-out infinite",transformOrigin:"32px 36px"}}>
        <rect x="18" y="6" width="28" height="24" rx="5" fill="#031a1c" stroke={color} strokeWidth="1.2" strokeOpacity="0.7"/>
        <rect x="20" y="9" width="24" height="16" rx="3" fill="#020e10" style={{animation:active?"flicker 7s ease-in-out infinite":"none"}}/>
        <g style={{animation:"blink 4.2s ease-in-out infinite",transformOrigin:"32px 17px"}}>
          <ellipse cx="26" cy="17" rx="4" ry="3.5" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="0.8"/>
          <ellipse cx="38" cy="17" rx="4" ry="3.5" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="0.8"/>
          <circle cx="26" cy="17" r="2.5" fill={color} fillOpacity="0.9"/>
          <circle cx="38" cy="17" r="2.5" fill={color} fillOpacity="0.9"/>
          <circle cx="25" cy="16" r="1" fill="#fff" fillOpacity="0.5"/>
          <circle cx="37" cy="16" r="1" fill="#fff" fillOpacity="0.5"/>
        </g>
        <rect x="22" y="22" width="20" height="2" rx="1" fill="#111"/>
        {active&&<rect x="23" y="22.5" width={talking?"18":"12"} height="1" rx="0.5" fill={color} fillOpacity="0.8" style={{animation:talking?"pulse .3s ease-in-out infinite":"none"}}/>}
        <line x1="28" y1="6" x2="28" y2="1" stroke={color} strokeWidth="0.9" strokeOpacity="0.6"/>
        <circle cx="28" cy="0.5" r="1.5" fill={color} fillOpacity="0.7" style={{animation:active?"pulse 1.1s ease-in-out infinite":"none"}}/>
        <line x1="36" y1="6" x2="36" y2="1" stroke={color} strokeWidth="0.9" strokeOpacity="0.6"/>
        <circle cx="36" cy="0.5" r="1.5" fill={color} fillOpacity="0.7" style={{animation:active?"pulse 1.1s ease-in-out infinite .55s":"none"}}/>
        <rect x="27" y="30" width="10" height="4" rx="2" fill="#021214" stroke={color} strokeWidth="0.6" strokeOpacity="0.4"/>
        <rect x="16" y="34" width="32" height="22" rx="4" fill="#031a1c" stroke={color} strokeWidth="1" strokeOpacity="0.5"/>
        {active&&<g><rect x="20" y="37" width="24" height="14" rx="2" fill={color} fillOpacity="0.04" stroke={color} strokeWidth="0.5" strokeOpacity="0.3"/>{[0,1,2,3].map(i=><rect key={i} x="22" y={39+i*3} width={[18,12,20,8][i]} height="1.5" rx="0.5" fill={color} fillOpacity={[.6,.4,.7,.3][i]} style={{animation:`pulse ${[.8,1,.7,1.2][i]}s ease-in-out infinite ${i*.15}s`}}/>)}</g>}
        <g style={{animation:walking?"armL .5s ease-in-out infinite":"none",transformOrigin:"14px 39px"}}>
          <rect x="9" y="35" width="7" height="15" rx="3" fill="#031a1c" stroke={color} strokeWidth="0.8" strokeOpacity="0.4"/>
          {typing?<g style={{animation:"typeBounce .17s ease-in-out infinite",transformOrigin:"12px 51px"}}><rect x="8" y="49" width="8" height="5" rx="2" fill={color} fillOpacity="0.9"/><rect x="9.5" y="51" width="1.5" height="1.5" rx="0.4" fill="#000" opacity="0.5"/><rect x="12" y="51" width="1.5" height="1.5" rx="0.4" fill="#000" opacity="0.5"/></g>:<rect x="9" y="50" width="7" height="4" rx="2" fill="#021214" stroke={color} strokeWidth="0.6" strokeOpacity="0.4"/>}
        </g>
        <g style={{animation:walking?"armR .5s ease-in-out infinite":"none",transformOrigin:"50px 39px"}}>
          <rect x="48" y="35" width="7" height="15" rx="3" fill="#031a1c" stroke={color} strokeWidth="0.8" strokeOpacity="0.4"/>
          {typing?<g style={{animation:"typeBounce .2s ease-in-out infinite .085s",transformOrigin:"52px 51px"}}><rect x="48" y="49" width="8" height="5" rx="2" fill={color} fillOpacity="0.9"/><rect x="49.5" y="51" width="1.5" height="1.5" rx="0.4" fill="#000" opacity="0.5"/><rect x="52" y="51" width="1.5" height="1.5" rx="0.4" fill="#000" opacity="0.5"/></g>:<rect x="48" y="50" width="7" height="4" rx="2" fill="#021214" stroke={color} strokeWidth="0.6" strokeOpacity="0.4"/>}
        </g>
        <g style={{animation:walking?"legL .5s ease-in-out infinite":"none",transformOrigin:"25px 56px"}}><rect x="19" y="56" width="10" height="13" rx="3" fill="#031a1c" stroke={color} strokeWidth="0.8" strokeOpacity="0.4"/><rect x="18" y="67" width="12" height="3.5" rx="2" fill={color} fillOpacity="0.5"/></g>
        <g style={{animation:walking?"legR .5s ease-in-out infinite":"none",transformOrigin:"39px 56px"}}><rect x="35" y="56" width="10" height="13" rx="3" fill="#031a1c" stroke={color} strokeWidth="0.8" strokeOpacity="0.4"/><rect x="34" y="67" width="12" height="3.5" rx="2" fill={color} fillOpacity="0.5"/></g>
        {thinking&&<><circle cx="43" cy="8" r="2.5" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="0.8" style={{animation:"think1 1.2s ease-in-out infinite"}}/><circle cx="49" cy="3" r="3.5" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="0.8" style={{animation:"think2 1.2s ease-in-out infinite"}}/><circle cx="56" cy="-1" r="5" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1" style={{animation:"think3 1.2s ease-in-out infinite"}}/><text x="56" y="2" textAnchor="middle" fontSize="6" fill={color} fillOpacity="0.9" fontFamily="monospace">@</text></>}
        {talking&&[0,5,10].map((o,i)=><rect key={i} x={52+o} y="32" width="2.5" height="7" rx="1.2" fill={color} fillOpacity="0.7" style={{animation:`wave .5s ease-in-out infinite ${i*.12}s`,transformOrigin:`${53.5+o}px 35.5px`}}/>)}
      </g>
    </svg>
  );
}

function VoxSprite({ color, animation, status }: SP) {
  const typing=animation==="typing", thinking=animation==="thinking", walking=animation==="walking", talking=animation==="talking";
  const active=!["idle","done"].includes(status);
  return (
    <svg viewBox="0 0 64 72" width="64" height="72" xmlns="http://www.w3.org/2000/svg">
      <style>{S}</style>
      <ellipse cx="32" cy="68" rx="10" ry="3" fill="#000" opacity="0.25"/>
      <g style={{animation:walking?"bob .5s ease-in-out infinite":"float 3s ease-in-out infinite",transformOrigin:"32px 38px"}}>
        <rect x="18" y="22" width="28" height="34" rx="5" fill="#1e0a2e" stroke={color} strokeWidth="1.2" strokeOpacity="0.9"/>
        <rect x="12" y="26" width="8" height="14" rx="3" fill="#1e0a2e" stroke={color} strokeWidth="0.8" strokeOpacity="0.8"/>
        <rect x="44" y="26" width="8" height="14" rx="3" fill="#1e0a2e" stroke={color} strokeWidth="0.8" strokeOpacity="0.8"/>
        <rect x="19" y="6" width="26" height="20" rx="6" fill="#1e0a2e" stroke={color} strokeWidth="1.2" strokeOpacity="0.95"/>
        <circle cx="32" cy="14" r="7" fill="#0d0118" stroke={color} strokeWidth="1" strokeOpacity="0.95"/>
        <circle cx="32" cy="14" r="5" fill="#1a0030" stroke="#c084fc" strokeWidth="0.6" style={{animation:active?"ariaRec 2s ease-in-out infinite":"none"}}/>
        <circle cx="32" cy="14" r="3" fill={color} opacity="0.5"/>
        <circle cx="32" cy="14" r="1.5" fill="#e9d5ff" opacity="0.9"/>
        <circle cx="30" cy="12" r="0.8" fill="#fff" opacity="0.7"/>
        <circle cx="42" cy="8" r="2.5" fill="#ff4466" style={{animation:active?"ariaRec 1s ease-in-out infinite":"none",opacity:active?1:0.3}}/>
        <rect x="44" y="8" width="3" height="8" rx="1.5" fill="#c084fc" opacity="0.6"/>
        <rect x="20" y="36" width="24" height="16" rx="2" fill="#0d0118" stroke={color} strokeWidth="0.8" strokeOpacity="0.9"/>
        <circle cx="26" cy="41" r="3" fill="none" stroke="#c084fc" strokeWidth="0.8" opacity="0.8"/>
        <circle cx="26" cy="41" r="1" fill="#c084fc" opacity="0.7"/>
        <circle cx="28.2" cy="38.8" r="0.6" fill="#c084fc" opacity="0.9"/>
        <rect x="30" y="38" width="5" height="5" rx="0.8" fill="none" stroke="#c084fc" strokeWidth="0.8" opacity="0.7"/>
        <rect x="31" y="39.5" width="1" height="3" rx="0.3" fill="#c084fc" opacity="0.8"/>
        <rect x="32.5" y="40" width="1.5" height="2.5" rx="0.3" fill="#c084fc" opacity="0.7"/>
        <rect x="22" y="46" width="20" height="2" rx="1" fill="#1e0a2e" opacity="0.8"/>
        <rect x="22" y="46" width={active?"16":"10"} height="2" rx="1" fill={color} opacity="0.9"/>
        {talking?<g transform="translate(32,30)">{[-6,-3,0,3,6].map((x,i)=><rect key={i} x={x-1.5} y="-3" width="3" height="6" rx="1.5" fill="#c084fc" opacity="0.85" style={{transformOrigin:`${x}px 0`,animation:`wave .4s ease-in-out infinite`,animationDelay:[".0s",".08s",".16s",".08s","0s"][i]}}/>)}</g>:<line x1="27" y1="30" x2="37" y2="30" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>}
        <g style={{animation:walking?"armL .5s ease-in-out infinite":typing?"typeBounce .25s ease-in-out infinite":"none",transformOrigin:"13px 32px"}}>
          <rect x="9" y="30" width="5" height="18" rx="2.5" fill="#1e0a2e" stroke={color} strokeWidth="0.7" strokeOpacity="0.85"/>
          <rect x="6" y="44" width="8" height="5" rx="1.5" fill="#2d0a4e" stroke="#c084fc" strokeWidth="0.6" opacity="0.8"/>
          <circle cx="10" cy="46.5" r="1.5" fill={color} opacity="0.6"/>
        </g>
        <g style={{animation:walking?"armR .5s ease-in-out infinite":typing?"typeBounce .25s ease-in-out infinite .125s":"none",transformOrigin:"51px 32px"}}>
          <rect x="50" y="30" width="5" height="18" rx="2.5" fill="#1e0a2e" stroke={color} strokeWidth="0.7" strokeOpacity="0.85"/>
        </g>
        <rect x="23" y="55" width="8" height="14" rx="3" fill="#1e0a2e" stroke={color} strokeWidth="0.7" strokeOpacity="0.8"/>
        <rect x="33" y="55" width="8" height="14" rx="3" fill="#1e0a2e" stroke={color} strokeWidth="0.7" strokeOpacity="0.8"/>
        <rect x="21" y="66" width="12" height="5" rx="2" fill="#2d0a4e" stroke={color} strokeWidth="0.6" strokeOpacity="0.8"/>
        <rect x="31" y="66" width="12" height="5" rx="2" fill="#2d0a4e" stroke={color} strokeWidth="0.6" strokeOpacity="0.8"/>
        <line x1="32" y1="6" x2="32" y2="1" stroke="#c084fc" strokeWidth="1" strokeLinecap="round" opacity="0.7"/>
        <circle cx="32" cy="0.5" r="1.5" fill={color} style={{animation:"ariaRec 1.5s ease-in-out infinite"}}/>
        {thinking&&<><circle cx="46" cy="18" r="2.5" fill="#1e0a2e" stroke={color} strokeWidth="0.7" style={{animation:"think1 1.8s ease-in-out infinite"}}/><circle cx="52" cy="12" r="4" fill="#1e0a2e" stroke={color} strokeWidth="0.7" style={{animation:"think2 1.8s ease-in-out infinite"}}/><circle cx="59" cy="6" r="5.5" fill="#1e0a2e" stroke={color} strokeWidth="0.9" style={{animation:"think3 1.8s ease-in-out infinite"}}/><text x="59" y="9" textAnchor="middle" fontSize="5.5" fill={color} opacity="0.9" style={{animation:"think3 1.8s ease-in-out infinite"}}>✦</text></>}
      </g>
    </svg>
  );
}

function AriaSprite({ color, animation, status }: SP) {
  const thinking=animation==="thinking", talking=animation==="talking";
  const active=!["idle","done"].includes(status);
  return (
    <svg viewBox="0 0 64 80" width="64" height="80" xmlns="http://www.w3.org/2000/svg" style={{overflow:"visible"}}>
      <style>{S}</style>
      <defs>
        <radialGradient id="ag-body" cx="50%" cy="40%" r="55%"><stop offset="0%" stopColor="#ffffff" stopOpacity="0.25"/><stop offset="100%" stopColor="#7ec8e3" stopOpacity="0.05"/></radialGradient>
        <radialGradient id="ag-face" cx="50%" cy="35%" r="60%"><stop offset="0%" stopColor="#e2f4ff" stopOpacity="0.5"/><stop offset="100%" stopColor="#7ec8e3" stopOpacity="0.1"/></radialGradient>
        <radialGradient id="ag-core" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#ffffff" stopOpacity="1"/><stop offset="100%" stopColor="#7ec8e3" stopOpacity="0"/></radialGradient>
        <clipPath id="ag-clip"><rect x="16" y="10" width="32" height="46" rx="8"/></clipPath>
        <filter id="ag-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="ag-soft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <g style={{animation:"ariaFloat 3s ease-in-out infinite",transformOrigin:"32px 40px"}}>
        <ellipse cx="32" cy="35" rx="26" ry="30" fill="none" stroke="#b8d4e8" strokeWidth="0.5" opacity="0.15" filter="url(#ag-soft)"/>
        <rect x="16" y="10" width="32" height="46" rx="8" fill="url(#ag-body)" stroke="#c8e8f8" strokeWidth="1" opacity="0.7"/>
        <g clipPath="url(#ag-clip)" opacity="0.4">
          {[0,8,16,24,32,40].map((y,i)=><line key={i} x1="16" y1={10+y} x2="48" y2={10+y} stroke="#7ec8e3" strokeWidth="0.5" opacity="0.4"/>)}
          <rect x="16" y="0" width="32" height="3" fill="url(#ag-face)" style={{animation:"ariaScan 2.5s linear infinite"}}/>
        </g>
        <rect x="20" y="20" width="24" height="7" rx="3.5" fill="url(#ag-face)" stroke="#b0dcf0" strokeWidth="0.5" opacity="0.85" filter="url(#ag-glow)"/>
        <circle cx="26" cy="23.5" r="2" fill="#ffffff" opacity="0.9" filter="url(#ag-glow)"/>
        <circle cx="38" cy="23.5" r="2" fill="#ffffff" opacity="0.9" filter="url(#ag-glow)"/>
        <line x1="24" y1="15" x2="40" y2="15" stroke="#7ec8e3" strokeWidth="0.5" opacity="0.5" strokeDasharray="2 2"/>
        {talking?<g transform="translate(32,34)">{[-8,-4,0,4,8].map((x,i)=><rect key={i} x={x-1.5} y="-3" width="3" height="6" rx="1.5" fill="#b0dcf0" opacity="0.9" style={{transformOrigin:`${x}px 0`,animation:`wave .4s ease-in-out infinite`,animationDelay:[".0s",".1s",".2s",".1s","0s"][i]}}/>)}</g>:<line x1="24" y1="34" x2="40" y2="34" stroke="#7ec8e3" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>}
        <rect x="21" y="39" width="22" height="12" rx="3" fill="#0a1a2a" fillOpacity="0.6" stroke="#7ec8e3" strokeWidth="0.5" opacity="0.8"/>
        {[0,1,2,3,4].map(i=>{const h=[6,9,5,10,7][i];return <rect key={i} x={23+i*4} y={51-h} width="2.5" height={h} rx="1" fill={active?"#b0dcf0":"#4a8fa8"} opacity={active?0.9:0.5} style={{transformOrigin:`${24.25+i*4}px 51px`,animation:active?`wave .6s ease-in-out infinite`:"none",animationDelay:`${i*.1}s`}}/>;}) }
        <line x1="26" y1="10" x2="22" y2="4" stroke="#8ecfe8" strokeWidth="1" strokeLinecap="round" opacity="0.7"/>
        <circle cx="22" cy="3.5" r="1.5" fill="#ffffff" opacity="0.8" filter="url(#ag-glow)"/>
        <line x1="38" y1="10" x2="42" y2="4" stroke="#8ecfe8" strokeWidth="1" strokeLinecap="round" opacity="0.7"/>
        <circle cx="42" cy="3.5" r="1.5" fill="#ffffff" opacity="0.8" filter="url(#ag-glow)"/>
        <rect x="10" y="32" width="7" height="16" rx="3" fill="#b8d4e8" fillOpacity="0.15" stroke="#7ec8e3" strokeWidth="0.5" opacity="0.6"/>
        <rect x="47" y="32" width="7" height="16" rx="3" fill="#b8d4e8" fillOpacity="0.15" stroke="#7ec8e3" strokeWidth="0.5" opacity="0.6"/>
        <rect x="21" y="55" width="9" height="12" rx="3" fill="#b8d4e8" fillOpacity="0.1" stroke="#7ec8e3" strokeWidth="0.5" opacity="0.5"/>
        <rect x="34" y="55" width="9" height="12" rx="3" fill="#b8d4e8" fillOpacity="0.1" stroke="#7ec8e3" strokeWidth="0.5" opacity="0.5"/>
        <circle cx="32" cy="33" r="3" fill="url(#ag-core)" style={{animation:"ariaCore 2s ease-in-out infinite",transformOrigin:"32px 33px"}} filter="url(#ag-soft)"/>
        <ellipse cx="32" cy="33" rx="18" ry="5" fill="none" stroke="#7ec8e3" strokeWidth="0.8" opacity="0.4" strokeDasharray="3 2" style={{animation:"ariaRing 4s linear infinite",transformOrigin:"32px 33px"}}/>
        <ellipse cx="32" cy="33" rx="14" ry="4" fill="none" stroke="#b0dcf0" strokeWidth="0.5" opacity="0.3" strokeDasharray="2 3" style={{animation:"ariaRing 6s linear reverse infinite",transformOrigin:"32px 33px"}}/>
        <g style={{transformOrigin:"32px 33px"}}><circle r="2" fill="#ffffff" opacity="0.8" style={{animation:"ariaOrbit1 3s linear infinite",transformOrigin:"32px 33px"}} filter="url(#ag-glow)"/></g>
        <g style={{transformOrigin:"32px 33px"}}><circle r="1.5" fill="#b0dcf0" opacity="0.7" style={{animation:"ariaOrbit2 3s linear infinite",transformOrigin:"32px 33px"}} filter="url(#ag-glow)"/></g>
        <g style={{transformOrigin:"32px 33px"}}><circle r="1" fill="#7ec8e3" opacity="0.6" style={{animation:"ariaOrbit3 3s linear infinite",transformOrigin:"32px 33px"}}/></g>
        {thinking&&<g><circle cx="48" cy="16" r="3" fill="#0d1f2d" stroke="#7ec8e3" strokeWidth="0.8" style={{animation:"think1 1.8s ease-in-out infinite"}}/><circle cx="53" cy="10" r="4.5" fill="#0d1f2d" stroke="#7ec8e3" strokeWidth="0.8" style={{animation:"think2 1.8s ease-in-out infinite"}}/><circle cx="60" cy="5" r="6" fill="#0d1f2d" stroke="#7ec8e3" strokeWidth="1" style={{animation:"think3 1.8s ease-in-out infinite"}}/><text x="60" y="8" textAnchor="middle" fontSize="6" fill="#7ec8e3" opacity="0.9" style={{animation:"think3 1.8s ease-in-out infinite"}}>?</text></g>}
      </g>
      <ellipse cx="32" cy="76" rx="16" ry="3" fill="#7ec8e3" opacity="0.12" style={{animation:"ariaBase 3s ease-in-out infinite",transformOrigin:"32px 76px"}} filter="url(#ag-soft)"/>
      <line x1="32" y1="67" x2="32" y2="74" stroke="#7ec8e3" strokeWidth="1" strokeDasharray="1 2" opacity="0.2"/>
    </svg>
  );
}

export default function AgentSprite({ id, color, isBlinking, status, animation }: Props) {
  if (id==="scout"||id==="lyra") return <ScoutSprite color={color} status={status} animation={animation}/>;
  if (id==="apex")  return <ApexSprite  color={color} status={status} animation={animation}/>;
  if (id==="vera")  return <VeraSprite  color={color} status={status} animation={animation}/>;
  if (id==="zion")  return <ZionSprite  color={color} status={status} animation={animation}/>;
  if (id==="forge") return <ForgeSprite color={color} status={status} animation={animation}/>;
  if (id==="echo")  return <EchoSprite  color={color} status={status} animation={animation}/>;
  if (id==="vox")   return <VoxSprite   color={color} status={status} animation={animation}/>;
  if (id==="aria")  return <AriaSprite  color={color} status={status} animation={animation}/>;
  return (
    <svg viewBox="0 0 64 72" width="64" height="72" xmlns="http://www.w3.org/2000/svg">
      <style>{S}</style>
      <ellipse cx="32" cy="68" rx="10" ry="3" fill="#000" opacity="0.2"/>
      <g style={{animation:"float 3s ease-in-out infinite",transformOrigin:"32px 36px"}}>
        <rect x="16" y="10" width="32" height="28" rx="6" fill="#111" stroke={color} strokeWidth="1.2" strokeOpacity="0.7"/>
        <g style={{animation:"blink 4s ease-in-out infinite",transformOrigin:"32px 24px"}}>
          <circle cx="24" cy="24" r="4" fill={color} fillOpacity="0.9"/>
          <circle cx="40" cy="24" r="4" fill={color} fillOpacity="0.9"/>
        </g>
        <rect x="18" y="38" width="28" height="18" rx="3" fill="#111" stroke={color} strokeWidth="1" strokeOpacity="0.5"/>
        <rect x="20" y="56" width="10" height="12" rx="3" fill="#111" stroke={color} strokeWidth="0.8" strokeOpacity="0.4"/>
        <rect x="34" y="56" width="10" height="12" rx="3" fill="#111" stroke={color} strokeWidth="0.8" strokeOpacity="0.4"/>
      </g>
    </svg>
  );
}