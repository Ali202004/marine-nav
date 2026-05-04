import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const WebView = Platform.OS !== 'web' ? require('react-native-webview').WebView : null;

import { useNavigation } from '@/context/NavigationContext';
import { useColors } from '@/hooks/useColors';
import { formatCoords, formatSpeed, mpsToKnots } from '@/utils/geo';
import { getTile, isOpen } from '@/utils/mbtiles';

const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:100%;height:100%;overflow:hidden;background:#0B1E35;}
canvas{display:block;touch-action:none;}
#toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(11,30,53,0.95);color:#fff;padding:7px 16px;border-radius:20px;font-size:12px;font-family:monospace;display:none;pointer-events:none;white-space:nowrap;border:1px solid #4DA6FF;z-index:100;letter-spacing:0.5px;}
</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="toast"></div>
<script>
const c=document.getElementById('c');
const ctx=c.getContext('2d');
const toast=document.getElementById('toast');
let toastTimer=null;
let S={
  lat:24.0,lng:45.0,zoom:5,
  tiles:{},pending:new Set(),
  gps:null,hdg:0,track:[],wpts:[],dest:null,anchor:null,
  trackColor:'#FF3D00',hasMB:false
};
function resize(){c.width=window.innerWidth;c.height=window.innerHeight;}
resize();window.addEventListener('resize',resize);
function l2t(lon,z){return(lon+180)/360*Math.pow(2,z);}
function a2t(lat,z){const r=lat*Math.PI/180;return(1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*Math.pow(2,z);}
function t2lon(tx,z){return tx/Math.pow(2,z)*360-180;}
function t2lat(ty,z){const n=Math.PI-2*Math.PI*ty/Math.pow(2,z);return 180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n)));}
function l2px(lat,lng){const tx=l2t(lng,S.zoom),ty=a2t(lat,S.zoom),cx=l2t(S.lng,S.zoom),cy=a2t(S.lat,S.zoom);return{x:(tx-cx)*256+c.width/2,y:(ty-cy)*256+c.height/2};}
function px2l(px,py){const cx=l2t(S.lng,S.zoom),cy=a2t(S.lat,S.zoom),tx=(px-c.width/2)/256+cx,ty=(py-c.height/2)/256+cy;return{lat:t2lat(ty,S.zoom),lng:t2lon(tx,S.zoom)};}
function fmtC(lat,lng){
  const ld=lat>=0?'N':'S',lo=lng>=0?'E':'W';
  const al=Math.abs(lat),ao=Math.abs(lng);
  const ld2=Math.floor(al),lm=((al-ld2)*60).toFixed(3).padStart(6,'0');
  const lo2=Math.floor(ao),om=((ao-lo2)*60).toFixed(3).padStart(6,'0');
  return ld+String(ld2).padStart(2,'0')+'\\xb0'+lm+"'  "+lo+String(lo2).padStart(3,'0')+'\\xb0'+om+"'";
}
function reqTile(z,x,y){
  const k=z+'/'+x+'/'+y;
  if(S.tiles[k]||S.pending.has(k))return;
  const mx=Math.pow(2,z);
  if(x<0||x>=mx||y<0||y>=mx)return;
  S.pending.add(k);
  if(S.hasMB)window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'tileRequest',z,x,y}));
}
function draw(){
  const W=c.width,H=c.height,TS=256;
  ctx.fillStyle='#0B1E35';ctx.fillRect(0,0,W,H);
  const cx=l2t(S.lng,S.zoom),cy=a2t(S.lat,S.zoom);
  const nX=Math.ceil(W/TS)+3,nY=Math.ceil(H/TS)+3;
  const sX=Math.floor(cx-nX/2),sY=Math.floor(cy-nY/2);
  for(let tx=sX;tx<=sX+nX;tx++){
    for(let ty=sY;ty<=sY+nY;ty++){
      const k=S.zoom+'/'+tx+'/'+ty,px=(tx-cx)*TS+W/2,py=(ty-cy)*TS+H/2;
      if(S.tiles[k]){ctx.drawImage(S.tiles[k],px,py,TS,TS);}
      else{
        reqTile(S.zoom,tx,ty);
        ctx.fillStyle='#0D2840';ctx.fillRect(px,py,TS,TS);
        ctx.strokeStyle='#1A3554';ctx.lineWidth=0.5;ctx.strokeRect(px,py,TS,TS);
        // Grid coords text
        ctx.fillStyle='#1E3D60';ctx.font='10px monospace';ctx.textAlign='center';
        ctx.fillText(S.zoom+'/'+tx+'/'+ty,px+TS/2,py+TS/2);
      }
    }
  }
  // Anchor circle
  if(S.anchor){
    const ap=l2px(S.anchor.lat,S.anchor.lng);
    // Calculate pixel radius based on zoom
    const metersPerPixel=156543.03392*Math.cos(S.anchor.lat*Math.PI/180)/Math.pow(2,S.zoom);
    const radiusPx=S.anchor.radius/metersPerPixel;
    ctx.beginPath();ctx.arc(ap.x,ap.y,Math.max(radiusPx,8),0,Math.PI*2);
    ctx.strokeStyle=S.anchor.alarming?'#FF3D00':'#FF9800';
    ctx.lineWidth=2;ctx.setLineDash([6,4]);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=S.anchor.alarming?'rgba(255,61,0,0.15)':'rgba(255,152,0,0.1)';ctx.fill();
    // Anchor icon
    ctx.fillStyle=S.anchor.alarming?'#FF3D00':'#FF9800';
    ctx.font='bold 18px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('\\u2693',ap.x,ap.y);ctx.textBaseline='alphabetic';
  }
  // Track
  if(S.track.length>1){
    ctx.beginPath();ctx.strokeStyle=S.trackColor;ctx.lineWidth=2.5;ctx.lineCap='round';ctx.lineJoin='round';
    const f=l2px(S.track[0][0],S.track[0][1]);ctx.moveTo(f.x,f.y);
    for(let i=1;i<S.track.length;i++){const p=l2px(S.track[i][0],S.track[i][1]);ctx.lineTo(p.x,p.y);}
    ctx.stroke();
  }
  // Waypoints
  S.wpts.forEach(wp=>{
    const p=l2px(wp.lat,wp.lng);
    if(p.x<-20||p.x>W+20||p.y<-20||p.y>H+20)return;
    ctx.fillStyle='#FF9800';
    ctx.beginPath();ctx.arc(p.x,p.y-11,7,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(p.x,p.y-11,2.5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#FF9800';ctx.beginPath();ctx.moveTo(p.x-3.5,p.y-7);ctx.lineTo(p.x+3.5,p.y-7);ctx.lineTo(p.x,p.y);ctx.fill();
    ctx.fillStyle='#fff';ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillText(wp.name.substring(0,8),p.x,p.y-23);
  });
  // Destination
  if(S.dest){
    const p=l2px(S.dest.lat,S.dest.lng);
    if(p.x>-20&&p.x<W+20&&p.y>-20&&p.y<H+20){
      ctx.fillStyle='#00E676';ctx.beginPath();ctx.arc(p.x,p.y-13,11,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff';ctx.font='bold 13px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('\\u2605',p.x,p.y-13);ctx.textBaseline='alphabetic';
      // Dashed line to destination
      if(S.gps){
        const gp=l2px(S.gps.lat,S.gps.lng);
        ctx.beginPath();ctx.moveTo(gp.x,gp.y);ctx.lineTo(p.x,p.y);
        ctx.strokeStyle='rgba(0,230,118,0.4)';ctx.lineWidth=1.5;ctx.setLineDash([6,6]);ctx.stroke();ctx.setLineDash([]);
      }
    }
  }
  // GPS location
  if(S.gps){
    const p=l2px(S.gps.lat,S.gps.lng);
    if(p.x>-60&&p.x<W+60&&p.y>-60&&p.y<H+60){
      ctx.beginPath();ctx.arc(p.x,p.y,24,0,Math.PI*2);
      ctx.fillStyle='rgba(77,166,255,0.1)';ctx.fill();
      ctx.strokeStyle='rgba(77,166,255,0.35)';ctx.lineWidth=1;ctx.stroke();
      ctx.beginPath();ctx.arc(p.x,p.y,9,0,Math.PI*2);
      ctx.fillStyle='#4DA6FF';ctx.fill();
      ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
      // Heading arrow
      const h=S.hdg*Math.PI/180;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(h);
      ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(0,-15);ctx.lineTo(-5,0);ctx.lineTo(5,0);ctx.closePath();ctx.fill();
      ctx.restore();
    }
  }
  // Scale bar (bottom right)
  drawScale();
  requestAnimationFrame(draw);
}
function drawScale(){
  const W=c.width,H=c.height;
  const metersPerPixel=156543.03392*Math.cos(S.lat*Math.PI/180)/Math.pow(2,S.zoom);
  const scaleMeters=[10,20,50,100,200,500,1000,2000,5000,10000,50000,100000];
  const targetPx=100;
  let chosen=scaleMeters[0];
  for(const m of scaleMeters){if(m/metersPerPixel<targetPx)chosen=m;else break;}
  const barPx=chosen/metersPerPixel;
  const x=W-barPx-16,y=H-20;
  ctx.fillStyle='rgba(11,30,53,0.7)';ctx.fillRect(x-4,y-14,barPx+8,18);
  ctx.strokeStyle='#4DA6FF';ctx.lineWidth=2;ctx.beginPath();
  ctx.moveTo(x,y);ctx.lineTo(x+barPx,y);
  ctx.moveTo(x,y-4);ctx.lineTo(x,y+4);
  ctx.moveTo(x+barPx,y-4);ctx.lineTo(x+barPx,y+4);
  ctx.stroke();
  ctx.fillStyle='#fff';ctx.font='bold 10px monospace';ctx.textAlign='center';
  const label=chosen>=1000?(chosen/1000)+'km':chosen+'m';
  ctx.fillText(label,x+barPx/2,y-2);
}
draw();
// Touch handling
let lx=0,ly=0,lpd=0,ltap=0,tstart=0,touching=false,moved=false;
c.addEventListener('touchstart',e=>{
  e.preventDefault();touching=true;moved=false;tstart=Date.now();
  if(e.touches.length===1){lx=e.touches[0].clientX;ly=e.touches[0].clientY;}
  else if(e.touches.length===2){const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;lpd=Math.sqrt(dx*dx+dy*dy);}
},{passive:false});
c.addEventListener('touchmove',e=>{
  e.preventDefault();moved=true;
  if(e.touches.length===1){
    const dx=e.touches[0].clientX-lx,dy=e.touches[0].clientY-ly;
    lx=e.touches[0].clientX;ly=e.touches[0].clientY;
    const sc=360/(Math.pow(2,S.zoom)*256);
    S.lng-=dx*sc;
    const ncy=a2t(S.lat,S.zoom)-dy/256;
    S.lat=Math.max(-85,Math.min(85,t2lat(ncy,S.zoom)));
    if(Object.keys(S.tiles).length>400)S.tiles={};
  }else if(e.touches.length===2){
    const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY,d=Math.sqrt(dx*dx+dy*dy);
    if(lpd>0){
      if(d/lpd>1.05&&S.zoom<18){S.zoom++;S.tiles={};S.pending.clear();}
      else if(d/lpd<0.95&&S.zoom>2){S.zoom--;S.tiles={};S.pending.clear();}
    }
    lpd=d;
  }
},{passive:false});
c.addEventListener('touchend',e=>{
  e.preventDefault();
  if(!touching)return;
  const dur=Date.now()-tstart;touching=false;
  if(!moved&&dur<250&&e.changedTouches.length===1){
    const now=Date.now();
    if(now-ltap<300){
      if(S.zoom<18){S.zoom++;S.tiles={};S.pending.clear();}
      ltap=0;
    }else{
      ltap=now;
      const t=e.changedTouches[0],cc=px2l(t.clientX,t.clientY);
      showToast(fmtC(cc.lat,cc.lng));
      window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'mapTap',lat:cc.lat,lng:cc.lng}));
    }
  }
},{passive:false});
function showToast(m){toast.textContent=m;toast.style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.style.display='none',3500);}
function handleMsg(e){
  try{
    const m=JSON.parse(e.data);
    switch(m.type){
      case 'tileData':{const k=m.z+'/'+m.x+'/'+m.y;S.pending.delete(k);if(m.data){const img=new Image();img.onload=()=>S.tiles[k]=img;img.src='data:image/png;base64,'+m.data;}break;}
      case 'gpsUpdate':S.gps={lat:m.lat,lng:m.lng};if(m.hdg!==null&&m.hdg!==undefined&&m.hdg>=0)S.hdg=m.hdg;break;
      case 'trackUpdate':S.track=m.points;break;
      case 'waypointsUpdate':S.wpts=m.waypoints;break;
      case 'destinationUpdate':S.dest=m.destination;break;
      case 'anchorUpdate':S.anchor=m.anchor;break;
      case 'setCenter':S.lat=m.lat;S.lng=m.lng;if(m.zoom&&m.zoom!==S.zoom){S.zoom=m.zoom;S.tiles={};S.pending.clear();}break;
      case 'zoomIn':if(S.zoom<18){S.zoom++;S.tiles={};S.pending.clear();}break;
      case 'zoomOut':if(S.zoom>2){S.zoom--;S.tiles={};S.pending.clear();}break;
      case 'setTrackColor':S.trackColor=m.color;break;
      case 'setMBTiles':S.hasMB=m.hasFile;S.tiles={};S.pending.clear();break;
    }
  }catch(err){}
}
window.addEventListener('message',handleMsg);
document.addEventListener('message',handleMsg);
</script>
</body>
</html>`;

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const nav = useNavigation();
  const webViewRef = useRef<any>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [waypointName, setWaypointName] = useState('');
  const [lockGPS, setLockGPS] = useState(false);

  const inject = useCallback((js: string) => {
    webViewRef.current?.injectJavaScript(js + '; true;');
  }, []);

  // GPS updates → WebView
  useEffect(() => {
    const loc = nav.gpsLocation;
    if (!loc) return;
    const { latitude: lat, longitude: lng } = loc.coords;
    const hdg = nav.activeHeading;
    inject(`handleMsg({data:JSON.stringify({type:'gpsUpdate',lat:${lat},lng:${lng},hdg:${hdg}})});`);
    if (lockGPS) {
      inject(`handleMsg({data:JSON.stringify({type:'setCenter',lat:${lat},lng:${lng}})});`);
    }
  }, [nav.gpsLocation, nav.activeHeading, lockGPS]);

  useEffect(() => {
    inject(`handleMsg({data:JSON.stringify({type:'trackUpdate',points:${JSON.stringify(nav.trackPoints)}})});`);
  }, [nav.trackPoints]);

  useEffect(() => {
    const wpts = nav.waypoints.map((w) => ({ lat: w.latitude, lng: w.longitude, name: w.name }));
    inject(`handleMsg({data:JSON.stringify({type:'waypointsUpdate',waypoints:${JSON.stringify(wpts)}})});`);
  }, [nav.waypoints]);

  useEffect(() => {
    const dest = nav.destination
      ? { lat: nav.destination.latitude, lng: nav.destination.longitude }
      : null;
    inject(`handleMsg({data:JSON.stringify({type:'destinationUpdate',destination:${JSON.stringify(dest)}})});`);
  }, [nav.destination]);

  useEffect(() => {
    inject(`handleMsg({data:JSON.stringify({type:'anchorUpdate',anchor:${JSON.stringify(nav.anchorWatch)}})});`);
  }, [nav.anchorWatch]);

  useEffect(() => {
    inject(`handleMsg({data:JSON.stringify({type:'setMBTiles',hasFile:${nav.hasMBTiles}})});`);
  }, [nav.hasMBTiles]);

  useEffect(() => {
    const c = nav.settings.trackColor === 'red' ? '#FF3D00' : '#1565C0';
    inject(`handleMsg({data:JSON.stringify({type:'setTrackColor',color:'${c}'})});`);
  }, [nav.settings.trackColor]);

  const handleWebMessage = useCallback(
    async (e: any) => {
      try {
        const msg = JSON.parse(e.nativeEvent.data);
        if (msg.type === 'tileRequest' && isOpen()) {
          const data = await getTile(msg.z, msg.x, msg.y);
          inject(
            `handleMsg({data:JSON.stringify({type:'tileData',z:${msg.z},x:${msg.x},y:${msg.y},data:${data ? `'${data}'` : 'null'}})});`
          );
        }
      } catch (_) {}
    },
    [inject]
  );

  const gpsOk = nav.isGPSReady;
  const gpsColor = !nav.gpsLocation ? '#FF5252' : gpsOk ? '#00E676' : '#FF9800';
  const speed = nav.gpsLocation?.coords.speed ?? 0;
  const knots = (speed * 1.94384).toFixed(1);
  const alt = nav.gpsLocation?.coords.altitude;

  return (
    <View style={styles.container}>
      {Platform.OS !== 'web' && WebView ? (
        <WebView
          ref={webViewRef}
          source={{ html: MAP_HTML }}
          style={styles.map}
          onMessage={handleWebMessage}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        />
      ) : (
        <View style={[styles.map, styles.webPlaceholder]}>
          <MaterialCommunityIcons name="map-outline" size={56} color="#1E3D60" />
          <Text style={styles.webPlaceholderText}>الخريطة تعمل على Android</Text>
          <Text style={styles.webPlaceholderSub}>امسح QR Code بـ Expo Go</Text>
        </View>
      )}

      {/* Top GPS Data Bar */}
      <View style={[styles.topBar, { top: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
        <View style={[styles.gpsDot, { backgroundColor: gpsColor }]} />
        <View style={styles.topBarData}>
          <Text style={styles.coordsText} numberOfLines={1}>
            {nav.gpsLocation
              ? formatCoords(nav.gpsLocation.coords.latitude, nav.gpsLocation.coords.longitude)
              : nav.gpsError ?? 'جاري تحديد الموقع...'}
          </Text>
          <View style={styles.statsRow}>
            <StatChip icon="radio-outline" value={`${nav.satellites}`} color="#4DA6FF" />
            <StatChip icon="speedometer-outline" value={`${knots}kts`} color="#FF9800" />
            {alt != null && (
              <StatChip icon="trending-up-outline" value={`${Math.round(alt)}m`} color="#C8A84B" />
            )}
            {nav.isTracking && <RecBadge />}
            {nav.anchorWatch?.active && <AnchorBadge alarming={nav.anchorWatch.alarming} />}
          </View>
        </View>
      </View>

      {/* GPS Permission Button (if no GPS yet) */}
      {!nav.gpsLocation && nav.permissionStatus !== 'granted' && Platform.OS !== 'web' && (
        <TouchableOpacity
          style={[styles.permBtn, { backgroundColor: '#4DA6FF' }]}
          onPress={nav.requestGPSPermission}
        >
          <Ionicons name="locate" size={16} color="#fff" />
          <Text style={styles.permBtnText}>تفعيل GPS</Text>
        </TouchableOpacity>
      )}

      {/* Right: Zoom controls */}
      <View style={[styles.rightBtns, { bottom: 80 + insets.bottom }]}>
        <MapFab onPress={() => inject(`handleMsg({data:JSON.stringify({type:'zoomIn'})});`)} >
          <Text style={styles.zoomTxt}>+</Text>
        </MapFab>
        <MapFab onPress={() => inject(`handleMsg({data:JSON.stringify({type:'zoomOut'})});`)}>
          <Text style={styles.zoomTxt}>−</Text>
        </MapFab>
      </View>

      {/* Left: Action buttons */}
      <View style={[styles.leftBtns, { bottom: 80 + insets.bottom }]}>
        <MapFab
          color={lockGPS ? '#4DA6FF' : undefined}
          onPress={() => {
            setLockGPS(!lockGPS);
            if (!lockGPS) {
              const g = nav.centerOnGPS();
              if (g) inject(`handleMsg({data:JSON.stringify({type:'setCenter',lat:${g.lat},lng:${g.lng},zoom:14})});`);
            }
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Ionicons name={lockGPS ? 'locate' : 'locate-outline'} size={20} color="#fff" />
        </MapFab>

        <MapFab
          onPress={() => {
            setWaypointName(`WPT${nav.waypoints.length + 1}`);
            setShowSaveModal(true);
          }}
        >
          <Ionicons name="star" size={18} color="#C8A84B" />
        </MapFab>

        <MapFab
          color={nav.anchorWatch?.active ? '#FF9800' : undefined}
          onPress={() => {
            if (nav.anchorWatch?.active) {
              nav.clearAnchorWatch();
            } else {
              nav.setAnchorHere();
            }
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
        >
          <Text style={{ fontSize: 18 }}>⚓</Text>
        </MapFab>

        {!nav.hasMBTiles && (
          <MapFab color="#FF9800" onPress={nav.pickMBTilesFile}>
            <MaterialCommunityIcons name="map-plus" size={18} color="#fff" />
          </MapFab>
        )}

        <MapFab
          color={nav.isTracking ? '#FF3D00' : '#4CAF50'}
          onPress={nav.isTracking ? nav.stopTracking : nav.startTracking}
        >
          <Ionicons name={nav.isTracking ? 'stop' : 'play'} size={18} color="#fff" />
        </MapFab>
      </View>

      {/* Save Waypoint Modal */}
      <Modal visible={showSaveModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { backgroundColor: '#132A47' }]}>
            <Text style={styles.modalTitle}>حفظ إحداثية</Text>
            <TextInput
              style={styles.modalInput}
              value={waypointName}
              onChangeText={setWaypointName}
              placeholder="اسم الإحداثية"
              placeholderTextColor="#4A6A8A"
              autoFocus
            />
            {nav.gpsLocation && (
              <Text style={styles.modalCoords}>
                {formatCoords(nav.gpsLocation.coords.latitude, nav.gpsLocation.coords.longitude)}
              </Text>
            )}
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#1E3D60' }]}
                onPress={() => setShowSaveModal(false)}
              >
                <Text style={{ color: '#fff' }}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#4DA6FF' }]}
                onPress={() => {
                  nav.saveCurrentWaypoint(waypointName.trim() || `WPT${nav.waypoints.length + 1}`);
                  setShowSaveModal(false);
                  setWaypointName('');
                }}
                disabled={!nav.gpsLocation}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>حفظ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatChip({ icon, value, color }: { icon: any; value: string; color: string }) {
  return (
    <View style={statStyles.chip}>
      <Ionicons name={icon} size={11} color={color} />
      <Text style={[statStyles.txt, { color }]}>{value}</Text>
    </View>
  );
}

function RecBadge() {
  return (
    <View style={statStyles.recBadge}>
      <View style={statStyles.recDot} />
      <Text style={statStyles.recTxt}>REC</Text>
    </View>
  );
}

function AnchorBadge({ alarming }: { alarming: boolean }) {
  return (
    <View style={[statStyles.anchorBadge, alarming && { backgroundColor: 'rgba(255,61,0,0.3)' }]}>
      <Text style={[statStyles.anchorTxt, alarming && { color: '#FF3D00' }]}>⚓ {alarming ? 'انجراف!' : 'راسٍ'}</Text>
    </View>
  );
}

function MapFab({
  children,
  onPress,
  color,
}: {
  children: React.ReactNode;
  onPress: () => void;
  color?: string;
}) {
  return (
    <TouchableOpacity
      style={[fabStyles.btn, color ? { backgroundColor: color } : {}]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {children}
    </TouchableOpacity>
  );
}

const statStyles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  txt: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  recBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,61,0,0.2)', borderRadius: 6,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  recDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FF3D00' },
  recTxt: { color: '#FF3D00', fontSize: 10, fontFamily: 'Inter_700Bold' },
  anchorBadge: {
    backgroundColor: 'rgba(255,152,0,0.2)', borderRadius: 6,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  anchorTxt: { color: '#FF9800', fontSize: 10, fontFamily: 'Inter_700Bold' },
});

const fabStyles = StyleSheet.create({
  btn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(19,42,71,0.92)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(77,166,255,0.15)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 5,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1E35' },
  map: { flex: 1 },
  webPlaceholder: { alignItems: 'center', justifyContent: 'center', gap: 10 },
  webPlaceholderText: { color: '#2A4A6F', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  webPlaceholderSub: { color: '#1E3D60', fontSize: 13, fontFamily: 'Inter_400Regular' },
  topBar: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(11,30,53,0.9)',
    paddingHorizontal: 12, paddingVertical: 7,
    borderBottomWidth: 1, borderBottomColor: 'rgba(77,166,255,0.1)',
  },
  gpsDot: { width: 9, height: 9, borderRadius: 5, marginRight: 8, flexShrink: 0 },
  topBarData: { flex: 1 },
  coordsText: {
    color: '#FFFFFF', fontSize: 13,
    fontFamily: 'Inter_600SemiBold', letterSpacing: 0.3,
  },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 3, flexWrap: 'wrap' },
  permBtn: {
    position: 'absolute', top: 100, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, shadowRadius: 6, elevation: 6,
  },
  permBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
  rightBtns: { position: 'absolute', right: 12, gap: 8 },
  leftBtns: { position: 'absolute', left: 12, gap: 8 },
  zoomTxt: { color: '#fff', fontSize: 24, fontWeight: '300', lineHeight: 28 },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalBox: { width: 300, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: 'rgba(77,166,255,0.15)' },
  modalTitle: { color: '#fff', fontSize: 17, fontFamily: 'Inter_700Bold', textAlign: 'center', marginBottom: 14 },
  modalInput: {
    borderWidth: 1, borderColor: '#1E3D60', borderRadius: 10,
    padding: 10, color: '#fff', fontSize: 15,
    fontFamily: 'Inter_500Medium', marginBottom: 8, textAlign: 'center',
  },
  modalCoords: { color: '#4DA6FF', fontSize: 12, fontFamily: 'Inter_600SemiBold', textAlign: 'center', marginBottom: 14, letterSpacing: 0.3 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, padding: 11, borderRadius: 10, alignItems: 'center' },
});
