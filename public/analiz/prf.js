

// ── Chart state ──────────────────────────────────────────────────────────
var _chartInst  = null;
var _chartSer   = null;
var _chartType  = 'candle';
var _chartIval  = 'D';
var _chartRange = '1y';
var _chartPct   = false;
var _chartData  = [];
var _chartSym2  = '';
var _chartEx2   = '';
var _chartInds  = { sma20: false, sma50: false, sma200: false, bb: false, vol: false };
var _chartIndS  = {};
var _chartDataIdx = {};
var _chartIndCache = {};
var _drawMode   = null;
var _drawPts    = [];
var _drawings   = [];
var _drawPreviewSer = null;
var _selectedDrawing = null;

function _themeColors() {
  var s = getComputedStyle(document.documentElement);
  var g = function(v) { return s.getPropertyValue(v).trim(); };
  return {
    bg:      g('--bg')      || '#09101e',
    s1:      g('--s1')      || '#0e1828',
    border:  g('--border')  || '#1e2d45',
    border2: g('--border2') || '#2d4060',
    text2:   g('--text2')   || '#7a8fb0',
    muted2:  g('--muted2')  || '#5c7898',
    accent:  g('--accent')  || '#0ea5e9',
  };
}

function _tbHtml() {
  var col = _themeColors();
  var b = function(id, label, on, fn) {
    var bd = on ? '1px solid '+col.accent : '1px solid '+col.border;
    var bg = on ? 'rgba(14,165,233,.1)' : 'transparent';
    var cl = on ? col.accent : col.text2;
    return '<button id="'+id+'" onclick="'+fn+'" style="padding:3px 8px;font-size:10px;font-weight:600;border-radius:4px;cursor:pointer;border:'+bd+';background:'+bg+';color:'+cl+';transition:all .15s;white-space:nowrap;font-family:Inter,sans-serif;line-height:1.5;">'+label+'</button>';
  };
  var sp = '<div style="width:1px;height:13px;background:'+col.border+';margin:0 2px;flex-shrink:0;"></div>';
  var T = _chartType, I = _chartIval, R = _chartRange, P = _chartPct;
  var Ids = _chartInds, Dm = _drawMode;
  var row1 =
    b('ct-c','Mum',T==='candle',"setChartType('candle')")+b('ct-l','Çizgi',T==='line',"setChartType('line')")+sp+
    b('ci-D','G',I==='D',"setChartInterval('D')")+b('ci-W','H',I==='W',"setChartInterval('W')")+b('ci-M','A',I==='M',"setChartInterval('M')")+sp+
    b('cr-1m','1A',R==='1m',"setChartRange('1m')")+b('cr-3m','3A',R==='3m',"setChartRange('3m')")+b('cr-6m','6A',R==='6m',"setChartRange('6m')")+b('cr-1y','1Y',R==='1y',"setChartRange('1y')")+b('cr-all','Tümü',R==='all',"setChartRange('all')")+sp+
    b('cp-pct','%',P,'setChartPct()');
  var row2 =
    b('ind-sma20','SMA 20',Ids.sma20,"toggleInd('sma20')")+b('ind-sma50','SMA 50',Ids.sma50,"toggleInd('sma50')")+b('ind-sma200','SMA 200',Ids.sma200,"toggleInd('sma200')")+b('ind-bb','BB',Ids.bb,"toggleInd('bb')")+b('ind-vol','Hacim',Ids.vol,"toggleInd('vol')")+sp+
    b('draw-trend','↗ Trend',Dm==='trend',"setDrawMode('trend')")+b('draw-ray','→ ışın',Dm==='ray',"setDrawMode('ray')")+b('draw-horizontal','— Yatay',Dm==='horizontal',"setDrawMode('horizontal')")+sp+
    '<button onclick="clearDrawings()" style="padding:3px 8px;font-size:10px;font-weight:600;border-radius:4px;cursor:pointer;border:1px solid #fecdd3;background:transparent;color:#f43f5e;transition:all .15s;white-space:nowrap;font-family:Inter,sans-serif;line-height:1.5;">✕ Temizle</button>';
  return '<div style="padding:7px 12px;border-bottom:1px solid '+col.border+';background:'+col.s1+';">'+
    '<div style="display:flex;align-items:center;gap:3px;flex-wrap:wrap;row-gap:4px;">'+row1+'</div>'+
    '<div style="display:flex;align-items:center;gap:3px;flex-wrap:wrap;row-gap:4px;margin-top:6px;padding-top:6px;border-top:1px solid '+col.border+';">'+row2+'</div>'+
    '</div>';
}

function _tbSet(id, on) {
  var btn = document.getElementById(id);
  if (!btn) return;
  var col = _themeColors();
  btn.style.border     = on ? '1px solid '+col.accent : '1px solid '+col.border;
  btn.style.background = on ? 'rgba(14,165,233,.1)' : 'transparent';
  btn.style.color      = on ? col.accent : col.text2;
}
function _tbGroup(prefix, vals, active) {
  vals.forEach(function(v) { _tbSet(prefix+v, v===active); });
}

function _chartFiltered() {
  if (_chartRange === 'all') return _chartData;
  var days = {'1m':30,'3m':91,'6m':182,'1y':365}[_chartRange] || 365;
  var since = Math.floor(Date.now()/1000) - days*86400;
  return _chartData.filter(function(c) { return c.time >= since; });
}

// ── Indicators ──────────────────────────────────────────────────────────
function _calcSMA(data, period) {
  var result=[], sum=0;
  for(var i=0;i<data.length;i++){
    sum+=data[i].close;
    if(i>=period) sum-=data[i-period].close;
    if(i>=period-1) result.push({time:data[i].time,value:sum/period});
  }
  return result;
}

function _calcBB(data, period, mult) {
  var result=[], sumX=0, sumX2=0;
  for(var i=0;i<data.length;i++){
    var c=data[i].close;
    sumX+=c; sumX2+=c*c;
    if(i>=period){var old=data[i-period].close;sumX-=old;sumX2-=old*old;}
    if(i>=period-1){
      var mean=sumX/period;
      var std=Math.sqrt(Math.max(0,sumX2/period-mean*mean));
      result.push({time:data[i].time,upper:mean+mult*std,middle:mean,lower:mean-mult*std});
    }
  }
  return result;
}

function _addIndSeries(key, data) {
  if(!_chartInst) return;
  data = data || _chartFiltered();
  if(!data.length) return;
  var mkL=function(color,w,dash){
    return _chartInst.addLineSeries({color:color,lineWidth:w||1,lineStyle:dash||0,priceLineVisible:false,lastValueVisible:false,crosshairMarkerVisible:false});
  };
  var full=_chartData.length?_chartData:data;
  var rng=data.length?{min:data[0].time,max:data[data.length-1].time}:null;
  var fil=rng?function(d){return d.time>=rng.min&&d.time<=rng.max;}:function(){return true;};
  function trySet(ser, d){try{ser.setData(d);}catch(e){return false;} return true;}
  if(key==='sma20'){
    if(!_chartIndCache.sma20) _chartIndCache.sma20=_calcSMA(full,20);
    if(!_chartIndS.sma20) _chartIndS.sma20=mkL('#3b82f6',1);
    if(!trySet(_chartIndS.sma20,_chartIndCache.sma20.filter(fil))){_chartIndS.sma20=mkL('#3b82f6',1);_chartIndS.sma20.setData(_chartIndCache.sma20.filter(fil));}
  }
  if(key==='sma50'){
    if(!_chartIndCache.sma50) _chartIndCache.sma50=_calcSMA(full,50);
    if(!_chartIndS.sma50) _chartIndS.sma50=mkL('#f59e0b',1);
    if(!trySet(_chartIndS.sma50,_chartIndCache.sma50.filter(fil))){_chartIndS.sma50=mkL('#f59e0b',1);_chartIndS.sma50.setData(_chartIndCache.sma50.filter(fil));}
  }
  if(key==='sma200'){
    if(!_chartIndCache.sma200) _chartIndCache.sma200=_calcSMA(full,200);
    if(!_chartIndS.sma200) _chartIndS.sma200=mkL('#ef4444',1.5);
    if(!trySet(_chartIndS.sma200,_chartIndCache.sma200.filter(fil))){_chartIndS.sma200=mkL('#ef4444',1.5);_chartIndS.sma200.setData(_chartIndCache.sma200.filter(fil));}
  }
  if(key==='bb'){
    if(!_chartIndCache.bb) _chartIndCache.bb=_calcBB(full,20,2);
    if(!_chartIndS.bb_u) _chartIndS.bb_u=mkL('#8b5cf6',1,1);
    if(!_chartIndS.bb_m) _chartIndS.bb_m=mkL('#8b5cf6',1,2);
    if(!_chartIndS.bb_l) _chartIndS.bb_l=mkL('#8b5cf6',1,1);
    var bbf=_chartIndCache.bb.filter(fil);
    try{_chartIndS.bb_u.setData(bbf.map(function(d){return{time:d.time,value:d.upper};}));}catch(e){}
    try{_chartIndS.bb_m.setData(bbf.map(function(d){return{time:d.time,value:d.middle};}));}catch(e){}
    try{_chartIndS.bb_l.setData(bbf.map(function(d){return{time:d.time,value:d.lower};}));}catch(e){}
  }
  if(key==='vol'){
    if(!_chartIndS.vol){
      _chartIndS.vol=_chartInst.addHistogramSeries({priceFormat:{type:'volume'},priceScaleId:'vol'});
      _chartInst.priceScale('vol').applyOptions({scaleMargins:{top:0.8,bottom:0}});
    }
    var vd=data.map(function(d){return{time:d.time,value:d.volume||0,color:d.close>=d.open?'rgba(16,185,129,.35)':'rgba(244,63,94,.3)'};});
    try{_chartIndS.vol.setData(vd);}catch(e){
      _chartIndS.vol=_chartInst.addHistogramSeries({priceFormat:{type:'volume'},priceScaleId:'vol'});
      _chartInst.priceScale('vol').applyOptions({scaleMargins:{top:0.8,bottom:0}});
      _chartIndS.vol.setData(vd);
    }
  }
}

function _removeIndSeries(key) {
  var rm=function(k){if(_chartIndS[k]&&_chartInst){try{_chartInst.removeSeries(_chartIndS[k]);}catch(e){}_chartIndS[k]=null;}};
  if(key==='bb'){rm('bb_u');rm('bb_m');rm('bb_l');}else rm(key);
}

function _redrawInds(data) {
  Object.keys(_chartInds).forEach(function(k){if(_chartInds[k]) _addIndSeries(k,data);});
}

function toggleInd(key) {
  _chartInds[key] = !_chartInds[key];
  _tbSet('ind-'+key, _chartInds[key]);
  if(_chartInds[key]) _addIndSeries(key); else _removeIndSeries(key);
}
// ── Drawing tools ─────────────────────────────────────────
function _segDist(px,py,x1,y1,x2,y2){
  var dx=x2-x1,dy=y2-y1,l2=dx*dx+dy*dy;
  if(!l2) return Math.sqrt((px-x1)*(px-x1)+(py-y1)*(py-y1));
  var t=Math.max(0,Math.min(1,((px-x1)*dx+(py-y1)*dy)/l2));
  return Math.sqrt(Math.pow(px-x1-t*dx,2)+Math.pow(py-y1-t*dy,2));
}

function _findNearDrawing(px,py){
  if(!_chartInst||!_chartSer) return -1;
  var best=-1,bestD=14;
  _drawings.forEach(function(d,i){
    try{
      if(d._pl){
        var ly=_chartSer.priceToCoordinate(d._price);
        if(ly!==null&&Math.abs(py-ly)<bestD){bestD=Math.abs(py-ly);best=i;}
      } else if(d._ser&&d._pts){
        var x1=_chartInst.timeScale().timeToCoordinate(d._pts[0].time);
        var y1=_chartSer.priceToCoordinate(d._pts[0].value);
        var x2=_chartInst.timeScale().timeToCoordinate(d._pts[1].time);
        var y2=_chartSer.priceToCoordinate(d._pts[1].value);
        if(x1!==null&&y1!==null&&x2!==null&&y2!==null){
          var dist=_segDist(px,py,x1,y1,x2,y2);
          if(dist<bestD){bestD=dist;best=i;}
        }
      }
    }catch(e){}
  });
  return best;
}

function _hideDeleteBtn(){
  var btn=document.getElementById('draw-del-btn');
  if(btn) btn.style.display='none';
}

function _showDeleteBtn(d){
  var el=document.getElementById('prf-chart-inner');
  if(!el||!_chartInst||!_chartSer) return;
  var btn=document.getElementById('draw-del-btn');
  if(!btn){
    btn=document.createElement('div');
    btn.id='draw-del-btn';
    btn.innerHTML='<svg width="10" height="10" viewBox="0 0 10 10"><line x1="1" y1="1" x2="9" y2="9" stroke="#fff" stroke-width="2"/><line x1="9" y1="1" x2="1" y2="9" stroke="#fff" stroke-width="2"/></svg>';
    btn.title='Sil (Delete)';
    btn.style.cssText='position:absolute;background:#f43f5e;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:50;box-shadow:0 2px 8px rgba(244,63,94,.4);user-select:none;right:40px;top:8px;';
    btn.onclick=function(e){e.stopPropagation();deleteSelectedDrawing();};
    el.appendChild(btn);
  }
  btn.style.display='flex';
}

function _deselectDrawing(){
  if(_selectedDrawing===null) return;
  var d=_drawings[_selectedDrawing];
  if(d){
    if(d._ser){try{d._ser.applyOptions({color:'#8b5cf6',lineWidth:1.5});}catch(e){} try{d._ser.setMarkers([]);}catch(e){}}
    if(d._pl){try{d._pl.applyOptions({color:'#8b5cf6',lineWidth:1});}catch(e){}}
  }
  _selectedDrawing=null;
  _hideDeleteBtn();
}

function _selectDrawing(idx){
  if(_selectedDrawing===idx){_deselectDrawing();return;}
  _deselectDrawing();
  _selectedDrawing=idx;
  var d=_drawings[idx];
  if(!d) return;
  if(d._ser){
    try{d._ser.applyOptions({color:'#a78bfa',lineWidth:2.5});}catch(e){}
    try{d._ser.setMarkers([
      {time:d._pts[0].time,position:'inBar',color:'#7c3aed',shape:'circle',size:1},
      {time:d._pts[1].time,position:'inBar',color:'#7c3aed',shape:'circle',size:1}
    ]);}catch(e){}
  }
  if(d._pl){try{d._pl.applyOptions({color:'#a78bfa',lineWidth:2});}catch(e){}}
  _showDeleteBtn(d);
}

function deleteSelectedDrawing(){
  if(_selectedDrawing===null) return;
  var d=_drawings[_selectedDrawing];
  if(d){
    if(d._pl){try{_chartSer.removePriceLine(d._pl);}catch(e){}}
    else if(d._ser){try{_chartInst.removeSeries(d._ser);}catch(e){}}
  }
  _drawings.splice(_selectedDrawing,1);
  _selectedDrawing=null;
  _hideDeleteBtn();
}

function _clearDrawPreview(){
  if(_drawPreviewSer&&_chartInst){try{_chartInst.removeSeries(_drawPreviewSer);}catch(e){}}
  _drawPreviewSer=null;
  if(_chartSer){try{_chartSer.setMarkers([]);}catch(e){}}
}

function setDrawMode(mode){
  _drawMode=(_drawMode===mode)?null:mode;
  ['trend','ray','horizontal'].forEach(function(m){_tbSet('draw-'+m,_drawMode===m);});
  _drawPts=[];
  _clearDrawPreview();
  _deselectDrawing();
  var el=document.getElementById('prf-chart-inner');
  if(el) el.style.cursor=_drawMode?'crosshair':'default';
}

function clearDrawings(){
  _deselectDrawing();
  _clearDrawPreview();
  _drawings.forEach(function(d){
    if(d._pl){try{_chartSer.removePriceLine(d._pl);}catch(e){}}
    else if(d._ser){try{_chartInst.removeSeries(d._ser);}catch(e){}}
  });
  _drawings=[]; _drawPts=[];
  var btn=document.getElementById('draw-del-btn');
  if(btn) btn.remove();
}

function _onChartClick(param){
  if(!param.time||!_chartInst||!_chartSer) return;
  if(!_drawMode){
    var pt=param.point;
    if(pt){var nIdx=_findNearDrawing(pt.x,pt.y); if(nIdx>=0)_selectDrawing(nIdx); else _deselectDrawing();}
    return;
  }
  var price=null;
  if(param.seriesData){var sd=param.seriesData.get(_chartSer);if(sd)price=sd.close!==undefined?sd.close:sd.value;}
  if(price==null){price=_chartDataIdx[param.time]||null;}
  if(price==null) return;
  if(_drawMode==='horizontal'){
    var pl=_chartSer.createPriceLine({price:price,color:'#8b5cf6',lineWidth:1,lineStyle:2,axisLabelVisible:true,title:price.toFixed(2)});
    _drawings.push({_pl:pl,_price:price}); return;
  }
  _drawPts.push({time:param.time,value:price});
  if(_drawPts.length===1){
    _chartSer.setMarkers([{time:param.time,position:'inBar',color:'#8b5cf6',shape:'circle',size:1}]);
    _drawPreviewSer=_chartInst.addLineSeries({color:'#8b5cf6',lineWidth:1,lineStyle:1,priceLineVisible:false,lastValueVisible:false,crosshairMarkerVisible:false});
    _drawPreviewSer.setData([{time:param.time,value:price}]);
  }
  if(_drawPts.length===2){
    var p1=_drawPts[0],p2=_drawPts[1];
    if(p1.time===p2.time){_drawPts=[];return;}
    _clearDrawPreview();
    var pts=[p1,p2].sort(function(a,b){return a.time-b.time;});
    if(_drawMode==='ray'){
      var last=_chartData[_chartData.length-1];
      if(last&&last.time>pts[1].time){
        var slope=(pts[1].value-pts[0].value)/(pts[1].time-pts[0].time);
        pts[1]={time:last.time,value:pts[0].value+slope*(last.time-pts[0].time)};
      }
    }
    var ls=_chartInst.addLineSeries({color:'#8b5cf6',lineWidth:1.5,priceLineVisible:false,lastValueVisible:false,crosshairMarkerVisible:false});
    ls.setData([{time:pts[0].time,value:pts[0].value},{time:pts[1].time,value:pts[1].value}]);
    _drawings.push({_ser:ls,_pts:[{time:pts[0].time,value:pts[0].value},{time:pts[1].time,value:pts[1].value}],_type:_drawMode});
    _drawPts=[];
  }
}
// ── Chart core ────────────────────────────────────────────────────────────
function _chartApply() {
  if (!_chartInst||!_chartSer||!_chartData.length) return;
  var data = _chartFiltered();
  if (!data.length) return;
  _chartSer.setData(_chartType==='line'
    ? data.map(function(c){return{time:c.time,value:c.close};})
    : data
  );
  _redrawInds(data);
  _chartInst.timeScale().fitContent();
}

function setChartType(type) {
  if (type===_chartType) return;
  _chartType = type;
  _tbGroup('ct-',['c','l'], type==='candle'?'c':'l');
  if (!_chartInst) return;
  try{_chartInst.removeSeries(_chartSer);}catch(e){}
  _chartSer = type==='line'
    ? _chartInst.addLineSeries({color:'#0ea5e9',lineWidth:2,crosshairMarkerRadius:4,priceLineVisible:false})
    : _chartInst.addCandlestickSeries({upColor:'#10b981',downColor:'#f43f5e',borderUpColor:'#10b981',borderDownColor:'#f43f5e',wickUpColor:'#10b981',wickDownColor:'#f43f5e'});
  _chartApply();
}

function setChartInterval(ival) {
  if (ival===_chartIval) return;
  _chartIval = ival;
  _tbGroup('ci-',['D','W','M'], ival);
  _fetchChart(_chartSym2, _chartEx2);
}

function setChartRange(range) {
  _chartRange = range;
  _tbGroup('cr-',['1m','3m','6m','1y','all'], range);
  _chartApply();
}

function setChartPct() {
  _chartPct = !_chartPct;
  _tbSet('cp-pct', _chartPct);
  if (_chartInst) _chartInst.priceScale('right').applyOptions({mode: _chartPct?2:0});
}

function _fetchChart(sym, ex) {
  var exMeta = EXCHANGE_META[ex]||EXCHANGE_META.bist;
  var suffix = encodeURIComponent(exMeta.symSuffix||'');
  var url = '/api/scan?action=chart&symbol='+sym+'&interval='+_chartIval+'&currency=TL&suffix='+suffix;
  fetch(url)
    .then(function(r){return r.json();})
    .then(function(data){
      if (!data||data.s!=='ok'||!data.candles||!data.candles.length) return;
      var seen = {};
      _chartData = data.candles
        .map(function(c){return{time:c.t,open:c.o,high:c.h,low:c.l,close:c.c,volume:c.v||0};})
        .filter(function(c){return c.open!=null&&c.close!=null;})
        .sort(function(a,b){return a.time-b.time;})
        .filter(function(c){if(seen[c.time])return false;seen[c.time]=1;return true;});
      _chartDataIdx={};
      _chartData.forEach(function(c){_chartDataIdx[c.time]=c.close;});
      _chartIndCache={};
      Object.keys(_chartInds).forEach(function(k){if(_chartInds[k])_removeIndSeries(k);});
      _chartApply();
      _fillTechFromCandles();
    })
    .catch(function(e){console.error('Chart error:',e);});
}

function loadTVWidget(sym, ex) {
  _chartSym2=sym; _chartEx2=ex;
  _chartData=[]; _chartInst=null; _chartSer=null; _chartPct=false;
  _drawMode=null; _drawPts=[]; _drawings=[]; _drawPreviewSer=null; _selectedDrawing=null; _chartIndS={}; _chartDataIdx={}; _chartIndCache={};

  var container = document.getElementById('prf-tv-widget');
  if (!container) return;
  var ph = document.getElementById('prf-tv-placeholder');
  if (ph) ph.style.display='none';

  var col = _themeColors();
  container.innerHTML = _tbHtml()+'<div id="prf-chart-inner" style="width:100%;height:256px;background:'+col.bg+';position:relative;"></div>';

  function _init() {
    var chartEl = document.getElementById('prf-chart-inner');
    if (!chartEl||!window.LightweightCharts) {
      if(chartEl) chartEl.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;color:'+col.text2+';font-size:12px;">Grafik kütüphanesi yüklenemedi</div>';
      return;
    }
    _chartInst = LightweightCharts.createChart(chartEl, {
      autoSize: true,
      layout:{background:{color:col.bg},textColor:col.text2,fontSize:11,fontFamily:'Inter, sans-serif'},
      grid:{vertLines:{color:col.border,style:1},horzLines:{color:col.border,style:1}},
      crosshair:{mode:LightweightCharts.CrosshairMode.Normal,vertLine:{color:col.border2,labelBackgroundColor:col.muted2},horzLine:{color:col.border2,labelBackgroundColor:col.muted2}},
      rightPriceScale:{borderColor:col.border,textColor:col.text2},
      timeScale:{borderColor:col.border,textColor:col.text2,timeVisible:true,secondsVisible:false},
      handleScroll:true, handleScale:true,
    });
    _chartSer = _chartInst.addCandlestickSeries({upColor:'#10b981',downColor:'#f43f5e',borderUpColor:'#10b981',borderDownColor:'#f43f5e',wickUpColor:'#10b981',wickDownColor:'#f43f5e'});
    _chartInst.subscribeClick(_onChartClick);
    var _previewRaf = null;
    _chartInst.subscribeCrosshairMove(function(param) {
      if (!_drawPreviewSer||!_drawPts.length||!param.time) return;
      var px = null;
      if (param.seriesData) { var sd2=param.seriesData.get(_chartSer); if(sd2) px=sd2.close!==undefined?sd2.close:sd2.value; }
      if(px==null){ px=_chartDataIdx[param.time]||null; }
      if (px==null) return;
      var p1=_drawPts[0];
      if (!p1||p1.time===param.time) return;
      var pts2=[p1,{time:param.time,value:px}].sort(function(a,b){return a.time-b.time;});
      if (_previewRaf) cancelAnimationFrame(_previewRaf);
      _previewRaf = requestAnimationFrame(function(){
        _previewRaf = null;
        if(!_drawPreviewSer) return;
        try{_drawPreviewSer.setData([{time:pts2[0].time,value:pts2[0].value},{time:pts2[1].time,value:pts2[1].value}]);}catch(e){}
      });
    });
    if(window._drawKeyH) document.removeEventListener('keydown',window._drawKeyH);
    window._drawKeyH=function(e){
      if((e.key==='Delete'||e.key==='Backspace')&&_selectedDrawing!==null){
        var ae=document.activeElement;
        if(!ae||ae.tagName!=='INPUT'){deleteSelectedDrawing();e.preventDefault();}
      }
      if(e.key==='Escape'){if(_selectedDrawing!==null)_deselectDrawing();else if(_drawMode)setDrawMode(_drawMode);}
    };
    document.addEventListener('keydown',window._drawKeyH);
    _fetchChart(sym, ex);
    var ld = document.getElementById('prf-live-dot');
    if (ld) ld.style.display='flex';
  }

  function _wait(n) {
    if (window.LightweightCharts) { _init(); }
    else if (n>0) { setTimeout(function(){_wait(n-1);},100); }
  }
  _wait(20);
}


function _mkSparkline(containerId, color, trend) {
  // trend: 'up' | 'down' | 'flat'
  var container = document.getElementById(containerId);
  if(!container) return;
  var pts = trend === 'up'   ? 'M0,40 L50,34 L100,26 L150,18 L200,10 L250,5 L300,2'
           : trend === 'down' ? 'M0,5  L50,10 L100,18 L150,26 L200,32 L250,38 L300,42'
           :                    'M0,22 L50,20 L100,24 L150,18 L200,22 L250,20 L300,22';
  var fill = pts + ' L300,44 L0,44Z';
  var cRgb = color === '#00c076' ? '0,192,118' : color === '#f0b429' ? '240,180,41' : '59,130,246';
  container.innerHTML =
    '<svg class="sparkline-svg" viewBox="0 0 300 44" preserveAspectRatio="none">'+
    '<defs><linearGradient id="sg'+containerId+'" x1="0" y1="0" x2="0" y2="1">'+
    '<stop offset="0%" stop-color="'+color+'" stop-opacity=".3"/>'+
    '<stop offset="100%" stop-color="'+color+'" stop-opacity="0"/></linearGradient></defs>'+
    '<path d="'+fill+'" fill="url(#sg'+containerId+')"/>'+
    '<path d="'+pts+'" fill="none" stroke="'+color+'" stroke-width="1.5"/>'+
    '</svg>';
}

function _buildTrend(d) {
  if(!d) return;
  var n = function(v){ return (v!==null&&v!==undefined&&!isNaN(Number(v)))?Number(v):null; };
  var revGrowth = n(d.total_revenue_change_ttm_yoy) || n(d.revenue_growth_ttm_yoy);
  var earnGrowth = n(d.earnings_per_share_diluted_yoy_growth_ttm) || n(d.earnings_per_share_change_ttm_yoy);

  // Gelir büyümesi
  var revEl  = document.getElementById('prf-rev-val');
  var revChg = document.getElementById('prf-rev-chg');
  if(revEl && revGrowth !== null) {
    revEl.textContent  = (revGrowth >= 0 ? '+' : '') + revGrowth.toFixed(1) + '%';
    revEl.style.color  = revGrowth >= 0 ? 'var(--green)' : 'var(--red)';
    if(revChg) { revChg.textContent = 'YoY TTM'; revChg.style.color = revGrowth >= 0 ? 'var(--green)' : 'var(--red)'; }
    _mkSparkline('prf-rev-spark', '#3b82f6', revGrowth > 5 ? 'up' : revGrowth < -5 ? 'down' : 'flat');
  } else {
    if(revEl) revEl.textContent = '—';
    _mkSparkline('prf-rev-spark', '#3b82f6', 'flat');
  }

  // Kazanç büyümesi
  var earnEl  = document.getElementById('prf-earn-val');
  var earnChg = document.getElementById('prf-earn-chg');
  if(earnEl && earnGrowth !== null) {
    earnEl.textContent  = (earnGrowth >= 0 ? '+' : '') + earnGrowth.toFixed(1) + '%';
    earnEl.style.color  = earnGrowth >= 0 ? 'var(--green)' : 'var(--red)';
    if(earnChg) { earnChg.textContent = 'YoY TTM'; earnChg.style.color = earnGrowth >= 0 ? 'var(--green)' : 'var(--red)'; }
    _mkSparkline('prf-earn-spark', '#00c076', earnGrowth > 5 ? 'up' : earnGrowth < -5 ? 'down' : 'flat');
  } else {
    if(earnEl) earnEl.textContent = '—';
    _mkSparkline('prf-earn-spark', '#00c076', 'flat');
  }

  // Performans barları
  var perfEl = document.getElementById('prf-perf-bars');
  if(perfEl) {
    var perfs = [
      {l:'1H', v:n(d.Perf_W)  || n(d.perfW)},
      {l:'1A', v:n(d.Perf_1M) || n(d.perf1M)},
      {l:'1Y', v:n(d.Perf_Y)  || n(d.perfY)},
    ];
    perfEl.innerHTML = perfs.map(function(p){
      if(p.v === null) return '<div class="perf-bar-row"><span class="perf-bar-label">'+p.l+'</span><div class="perf-bar-track"><div class="perf-bar-fill" style="width:0%;background:var(--muted)"></div></div><span class="perf-bar-val" style="color:var(--muted)">—</span></div>';
      var pct = Math.min(Math.abs(p.v), 50);
      var w = (pct / 50 * 100).toFixed(1);
      var col = p.v >= 0 ? 'var(--green)' : 'var(--red)';
      var txt = (p.v >= 0 ? '+' : '') + p.v.toFixed(1) + '%';
      return '<div class="perf-bar-row">'+
        '<span class="perf-bar-label">'+p.l+'</span>'+
        '<div class="perf-bar-track"><div class="perf-bar-fill" style="width:'+w+'%;background:'+col+'"></div></div>'+
        '<span class="perf-bar-val" style="color:'+col+'">'+txt+'</span>'+
      '</div>';
    }).join('');
  }
}


// ── Hangi Yatırımcı Neden Alabilir? ─────────────────────────────────────
var _INV_FIT_PHRASES = {
  'F/K < 15':               { p:'F/K 15x altında, değer eşiğini karşılıyor', f:'F/K 15x üzerinde, hisse primli fiyatlanıyor' },
  'F/K < 20':               { p:'F/K 20x altında, makul fiyatlama', f:'F/K 20x üzerinde, değerleme yüksek' },
  'F/K < 25':               { p:'F/K kabul edilebilir aralıkta', f:'F/K 25x üzerinde, fiyat kazanca göre yüksek' },
  'F/K < 30':               { p:'F/K büyüme beklentisiyle örtüşüyor', f:'F/K 30x üzerinde, büyüme zaten fiyatlanmış görünüyor' },
  'PD/DD < 1.5':            { p:'PD/DD 1.5x altında, defter değerine yakın fiyatlama', f:'PD/DD 1.5x üzerinde, varlıklara göre primli' },
  'ROE > 15%':              { p:'ROE %15 üzerinde, güçlü özsermaye getirisi', f:'ROE %15 altında, özsermaye verimliliği sınırlı' },
  'ROE > 12%':              { p:'ROE %12 üzerinde, tatmin edici özsermaye getirisi', f:'ROE %12 altında, özsermaye verimliliği büyüme yatırımcısı beklentisinin altında' },
  'ROE > 10%':              { p:'ROE %10 üzerinde, pozitif özsermaye getirisi', f:'ROE %10 altında, sermaye verimliliği düşük' },
  'Net Marj > 10%':         { p:'net marj %10 üzerinde, sağlıklı karlılık', f:'net marj %10 altında, kar marjı dar' },
  'Net Marj > 8%':          { p:'net marj %8 üzerinde, temettü sürdürülebilirliğini destekler', f:'net marj %8 altında, dar kar marjı temettü sürekliliğini zorlayabilir' },
  'Net Marj > 5%':          { p:'net marj %5 üzerinde, pozitif karlılık', f:'net marj %5 altında, karlılık zayıf' },
  'Brüt Marj > 30%':        { p:'brüt marj %30 üzerinde, rekabetçi ürün/hizmet gücünü yansıtıyor', f:'brüt marj %30 altında, ham karlılık baskı altında' },
  'Brüt Marj > 40%':        { p:'brüt marj %40 üzerinde, teknoloji şirketi profiline uygun güçlü marj', f:'brüt marj %40 altında, teknoloji yatırımcısının beklediği seviyenin altında' },
  'Borç/Öz < 0.5':          { p:'düşük borç/özsermaye oranı finansal esneklik sağlıyor', f:'borç/özsermaye yüksek, finansal kaldıraç riski var' },
  'Borç/Öz < 1':            { p:'borç/özsermaye yönetilebilir seviyede', f:'borç/özsermaye 1x üzerinde, borç yükü dikkat gerektiriyor' },
  'Borç/Öz < 0.8':          { p:'borç seviyesi makul', f:'borç/özsermaye 0.8x üzerinde' },
  'F-Skor ≥ 7':             { p:'Piotroski F-Skoru 7+, güçlü bilanço sağlığı', f:'F-Skor 7 altında, bilanço iyileştirme sinyalleri sınırlı' },
  'F-Skor ≥ 6':             { p:'F-Skor 6+, finansal tablolar tutarlı görünüyor', f:'F-Skor 6 altında, finansal tablolarda zayıf sinyaller var' },
  'F-Skor ≥ 5':             { p:'F-Skor 5+, finansal görünüm nötr/pozitif', f:'F-Skor 5 altında, dikkat gerektiren finansal sinyaller mevcut' },
  'Gelir Büyümesi > 15%':   { p:'gelir büyümesi %15 üzerinde, güçlü büyüme ivmesi var', f:'gelir büyümesi %15 altında, beklenen büyüme ivmesi henüz görünmüyor' },
  'Gelir Büyümesi > 10%':   { p:'gelir büyümesi %10 üzerinde', f:'gelir büyümesi %10 altında' },
  'Gelir Büyümesi > 20%':   { p:'gelir büyümesi %20 üzerinde, yüksek ivmeli büyüme', f:'gelir büyümesi %20 altında' },
  'EPS Büyümesi > 20%':     { p:'hisse başı kazanç büyümesi güçlü', f:'hisse başı kazanç büyümesi beklentinin altında' },
  'EPS Büyümesi > 30%':     { p:'hisse başı kazanç büyümesi %30 üzerinde, güçlü kazanç ivmesi', f:'hisse başı kazanç büyümesi beklentinin altında' },
  'EPS Büyümesi pozitif':   { p:'kazanç büyümesi pozitif yönde', f:'kazanç büyümesi negatif' },
  'PEG < 1':                { p:'PEG 1 altında, büyümeye göre fiyatlama cazip görünüyor', f:'PEG 1 üzerinde, büyüme tam fiyatlanmış görünüyor' },
  'Cari Oran > 1.2':        { p:'cari oran yeterli kısa vadeli likidite sağlıyor', f:'cari oran 1.2x altında, kısa vadeli yükümlülüklerde risk var' },
  'Cari Oran > 1.5':        { p:'cari oran 1.5x üzerinde, güçlü kısa vadeli likidite', f:'cari oran 1.5x altında, defansif profil için likidite riski mevcut' },
  'Temettü Verimi > 3%':    { p:'temettü verimi %3 üzerinde, cazip nakit getirisi', f:'temettü verimi %3 altında, temettü yatırımcısı için yeterli değil' },
  'Temettü > 2%':           { p:'temettü verimi %2 üzerinde, savunma portföyüne nakit katkısı var', f:'temettü verimi %2 altında' },
  'Temettü > 1%':           { p:'temettü verimi mevcut', f:'temettü verimi %1 altında veya dağıtılmıyor' },
  '52H Yüksek yakını':      { p:'fiyat 52 haftalık zirveye yakın, momentum güçlü', f:'fiyat 52 haftalık zirveden uzakta, momentum zayıf' },
  'Aylık Perf. > 5%':       { p:'aylık performans %5 üzerinde, kısa vadeli ivme pozitif', f:'aylık performans %5 altında, kısa vadeli ivme zayıf' },
  'Yıllık Perf. > 20%':     { p:'yıllık performans %20 üzerinde, güçlü uzun vadeli trend', f:'yıllık performans %20 altında, uzun vadeli ivme sınırlı' },
  'Aylık Perf. > 10%':      { p:'aylık fiyat hareketi güçlü', f:'aylık fiyat hareketi beklentinin altında' },
  'Beta > 1.3':             { p:'yüksek beta, piyasanın üzerinde fiyat hareketi bekleniyor', f:'beta düşük, spekülatif profil için fiyat oynaklığı sınırlı' },
  'Piy. Değ. < 2Mrd':      { p:'küçük piyasa değeri büyüme potansiyeli açısından ilgi çekici', f:'piyasa değeri 2 milyar üzerinde, küçük sermaye profili değil' },
};

function _buildInvExplanation(crits) {
  var passList = crits.filter(function(c){ return c.p && _INV_FIT_PHRASES[c.t]; }).slice(0, 3);
  var failList = crits.filter(function(c){ return !c.p && _INV_FIT_PHRASES[c.t]; }).slice(0, 2);
  if (!passList.length && !failList.length) return '';
  var parts = [];
  if (passList.length) parts.push(passList.map(function(c){ return _INV_FIT_PHRASES[c.t].p; }).join(', ')+'.');
  if (failList.length) parts.push('Öte yandan '+failList.map(function(c){ return _INV_FIT_PHRASES[c.t].f; }).join('; ')+'.');
  return parts.join(' ');
}

function _renderInvestorFit(d) {
  var el = document.getElementById('prf-investor-fit');
  if (!el) return;
  if (!d) { el.innerHTML = '<div style="padding:24px 0;text-align:center;color:var(--muted);font-size:12px;">Veri yok.</div>'; return; }

  var n = function(v) { return (v != null && !isNaN(+v)) ? +v : null; };
  var pe   = n(d.pe_ratio);
  var pb   = n(d.price_book_ratio);
  var roe  = d.roe  != null ? n(d.roe)  * 100 : null;
  var nm   = d.net_margin   != null ? n(d.net_margin)   * 100 : null;
  var gm   = d.gross_margin != null ? n(d.gross_margin) * 100 : null;
  var de   = n(d.debt_to_equity);
  var cr   = n(d.current_ratio);
  var dy   = d.dividend_yield_recent != null ? n(d.dividend_yield_recent) * 100 : null;
  var peg  = n(d.peg_ratio);
  var fs   = n(d.piotroski_f_score);
  var rg   = n(d.revenue_growth_ttm_yoy != null ? d.revenue_growth_ttm_yoy : d.total_revenue_change_ttm_yoy);
  var eg   = n(d.earnings_per_share_change_ttm_yoy != null ? d.earnings_per_share_change_ttm_yoy : d.eps_growth_ttm_yoy);
  var pm   = n(d.Perf_1M != null ? d.Perf_1M : d.perf1M);
  var py   = n(d.Perf_Y  != null ? d.Perf_Y  : d.perfY);
  var mc   = n(d.market_cap_basic);
  var beta = n(d.beta);
  var price  = n(d.close || d.price);
  var high52 = n(d['52_week_high']);
  var nearHigh52 = (price && high52 && high52 > 0) ? ((price / high52 - 1) * 100) : null;

  var fv = function(v, fmt) { return v != null ? fmt(v) : '—'; };
  var pctFmt = function(v) { return (v >= 0 ? '+' : '') + v.toFixed(1) + '%'; };

  var types = [
    {
      id:'value', emoji:'', name:'Değer Yatırımcısı', color:'#3b82f6',
      desc:'Ucuz fiyatlı, sağlam bilançolu şirketleri arar',
      crits:[
        {t:'F/K < 15',       v:fv(pe, function(v){return v.toFixed(1)+'x';}),  p:pe!=null&&pe>0&&pe<15},
        {t:'PD/DD < 1.5',    v:fv(pb, function(v){return v.toFixed(2)+'x';}),  p:pb!=null&&pb<1.5},
        {t:'ROE > 15%',      v:fv(roe,function(v){return v.toFixed(1)+'%';}),  p:roe!=null&&roe>15},
        {t:'Net Marj > 10%', v:fv(nm, function(v){return v.toFixed(1)+'%';}),  p:nm!=null&&nm>10},
        {t:'Borç/Öz < 0.5', v:fv(de, function(v){return v.toFixed(2);}),      p:de!=null&&de<0.5},
        {t:'F-Skor ≥ 7',     v:fv(fs, function(v){return v+'/9';}),             p:fs!=null&&fs>=7},
      ]
    },
    {
      id:'growth', emoji:'', name:'Büyüme Yatırımcısı', color:'#10b981',
      desc:'Hızlı büyüyen, yüksek potansiyelli şirketleri arar',
      crits:[
        {t:'Gelir Büyümesi > 15%', v:fv(rg, pctFmt), p:rg!=null&&rg>15},
        {t:'EPS Büyümesi > 20%',   v:fv(eg, pctFmt), p:eg!=null&&eg>20},
        {t:'PEG < 1',              v:fv(peg,function(v){return v.toFixed(2);}), p:peg!=null&&peg>0&&peg<1},
        {t:'Brüt Marj > 30%',      v:fv(gm, function(v){return v.toFixed(1)+'%';}), p:gm!=null&&gm>30},
        {t:'ROE > 12%',            v:fv(roe,function(v){return v.toFixed(1)+'%';}), p:roe!=null&&roe>12},
        {t:'Borç/Öz < 1',         v:fv(de, function(v){return v.toFixed(2);}), p:de!=null&&de<1},
      ]
    },
    {
      id:'div', emoji:'', name:'Temettü Yatırımcısı', color:'#f59e0b',
      desc:'Düzenli ve yüksek temettü ödeyen şirketleri arar',
      crits:[
        {t:'Temettü Verimi > 3%', v:fv(dy, function(v){return v.toFixed(1)+'%';}), p:dy!=null&&dy>3},
        {t:'Net Marj > 8%',       v:fv(nm, function(v){return v.toFixed(1)+'%';}), p:nm!=null&&nm>8},
        {t:'F-Skor ≥ 6',          v:fv(fs, function(v){return v+'/9';}),            p:fs!=null&&fs>=6},
        {t:'Borç/Öz < 1',        v:fv(de, function(v){return v.toFixed(2);}),      p:de!=null&&de<1},
        {t:'Cari Oran > 1.2',     v:fv(cr, function(v){return v.toFixed(2)+'x';}), p:cr!=null&&cr>1.2},
        {t:'ROE > 10%',           v:fv(roe,function(v){return v.toFixed(1)+'%';}), p:roe!=null&&roe>10},
      ]
    },
    {
      id:'mom', emoji:'', name:'Momentum Yatırımcısı', color:'#8b5cf6',
      desc:'Fiyat ve kazanç ivmesi güçlü hisseleri arar',
      crits:[
        {t:'52H Yüksek yakını',    v:fv(nearHigh52,function(v){return v.toFixed(1)+'%';}), p:nearHigh52!=null&&nearHigh52>-10},
        {t:'Aylık Perf. > 5%',    v:fv(pm, pctFmt), p:pm!=null&&pm>5},
        {t:'Yıllık Perf. > 20%',  v:fv(py, pctFmt), p:py!=null&&py>20},
        {t:'Gelir Büyümesi > 10%',v:fv(rg, pctFmt), p:rg!=null&&rg>10},
        {t:'EPS Büyümesi pozitif', v:fv(eg, pctFmt), p:eg!=null&&eg>0},
      ]
    },
    {
      id:'def', emoji:'', name:'Defansif Yatırımcı', color:'#64748b',
      desc:'Düşük riskli, istikrarlı şirketleri tercih eder',
      crits:[
        {t:'Borç/Öz < 0.5',  v:fv(de, function(v){return v.toFixed(2);}),      p:de!=null&&de<0.5},
        {t:'Cari Oran > 1.5', v:fv(cr, function(v){return v.toFixed(2)+'x';}), p:cr!=null&&cr>1.5},
        {t:'Net Marj > 5%',   v:fv(nm, function(v){return v.toFixed(1)+'%';}), p:nm!=null&&nm>5},
        {t:'Temettü > 2%',    v:fv(dy, function(v){return v.toFixed(1)+'%';}), p:dy!=null&&dy>2},
        {t:'F-Skor ≥ 6',      v:fv(fs, function(v){return v+'/9';}),            p:fs!=null&&fs>=6},
        {t:'F/K < 20',        v:fv(pe, function(v){return v.toFixed(1)+'x';}), p:pe!=null&&pe>0&&pe<20},
      ]
    },
    {
      id:'small', emoji:'', name:'Küçük Sermaye', color:'#06b6d4',
      desc:'Büyüme potansiyeli yüksek küçük şirketleri arar',
      crits:[
        {t:'Piy. Değ. < 2Mrd', v:fv(mc, function(v){return v.toFixed(0)+'M';}), p:mc!=null&&mc<2000},
        {t:'Gelir Büyümesi > 10%', v:fv(rg, pctFmt), p:rg!=null&&rg>10},
        {t:'F/K < 20',         v:fv(pe, function(v){return v.toFixed(1)+'x';}), p:pe!=null&&pe>0&&pe<20},
        {t:'ROE > 10%',        v:fv(roe,function(v){return v.toFixed(1)+'%';}), p:roe!=null&&roe>10},
        {t:'F-Skor ≥ 5',       v:fv(fs, function(v){return v+'/9';}),            p:fs!=null&&fs>=5},
      ]
    },
    {
      id:'spec', emoji:'', name:'Spekülatif Yatırımcı', color:'#f43f5e',
      desc:'Yüksek risk-getiri profilindeki hisseleri arar',
      crits:[
        {t:'Beta > 1.3',          v:fv(beta,function(v){return v.toFixed(2);}), p:beta!=null&&beta>1.3},
        {t:'Aylık Perf. > 10%',   v:fv(pm, pctFmt), p:pm!=null&&pm>10},
        {t:'EPS Büyümesi > 30%',  v:fv(eg, pctFmt), p:eg!=null&&eg>30},
        {t:'Gelir Büyümesi > 20%',v:fv(rg, pctFmt), p:rg!=null&&rg>20},
      ]
    },
    {
      id:'tech', emoji:'', name:'Teknoloji Odaklı', color:'#0ea5e9',
      desc:'Teknoloji ve yüksek büyümeli sektörleri arar',
      crits:[
        {t:'Gelir Büyümesi > 20%', v:fv(rg, pctFmt), p:rg!=null&&rg>20},
        {t:'Brüt Marj > 40%',      v:fv(gm, function(v){return v.toFixed(1)+'%';}), p:gm!=null&&gm>40},
        {t:'ROE > 15%',            v:fv(roe,function(v){return v.toFixed(1)+'%';}), p:roe!=null&&roe>15},
        {t:'F/K < 30',             v:fv(pe, function(v){return v.toFixed(1)+'x';}), p:pe!=null&&pe>0&&pe<30},
        {t:'Borç/Öz < 0.8',       v:fv(de, function(v){return v.toFixed(2);}),      p:de!=null&&de<0.8},
      ]
    },
    {
      id:'bal', emoji:'', name:'Dengeli Yatırımcı', color:'#a78bfa',
      desc:'Risk ve getiriyi dengeleyen karma strateji uygular',
      crits:[
        {t:'F/K < 20',     v:fv(pe, function(v){return v.toFixed(1)+'x';}), p:pe!=null&&pe>0&&pe<20},
        {t:'ROE > 10%',    v:fv(roe,function(v){return v.toFixed(1)+'%';}), p:roe!=null&&roe>10},
        {t:'Net Marj > 5%',v:fv(nm, function(v){return v.toFixed(1)+'%';}), p:nm!=null&&nm>5},
        {t:'Temettü > 1%', v:fv(dy, function(v){return v.toFixed(1)+'%';}), p:dy!=null&&dy>1},
        {t:'Borç/Öz < 1', v:fv(de, function(v){return v.toFixed(2);}),      p:de!=null&&de<1},
        {t:'F-Skor ≥ 5',   v:fv(fs, function(v){return v+'/9';}),            p:fs!=null&&fs>=5},
      ]
    },
  ];

  var _userType = null;
  try { var _u = JSON.parse(localStorage.getItem('deepfin_user')||'null'); if(_u&&_u.investorType) _userType=_u.investorType; } catch(e){}

  var html = types.map(function(t) {
    var passed = t.crits.filter(function(c){return c.p;}).length;
    var total  = t.crits.length;
    var ratio  = passed / total;
    var scoreColor = ratio >= 0.65 ? '#10b981' : ratio >= 0.40 ? '#f0b429' : 'var(--muted2)';
    var leftColor  = ratio >= 0.65 ? '#10b981' : ratio >= 0.40 ? '#f0b429' : 'var(--border2)';
    var isUser = _userType === t.id;
    var isOpen = isUser;

    var critHtml = t.crits.map(function(c){
      return '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);">'+
        '<div style="display:flex;align-items:center;gap:7px;">'+
        '<div style="width:7px;height:7px;border-radius:50%;flex-shrink:0;background:'+(c.p?'#10b981':'var(--border2)')+'"></div>'+
        '<span style="font-size:11px;color:'+(c.p?'var(--text2)':'var(--muted2)')+';">'+c.t+'</span>'+
        '</div>'+
        (c.v&&c.v!=='—'?'<span style="color:var(--muted2);font-size:10px;font-family:\'Inter\',sans-serif;">'+c.v+'</span>':'')+
        '</div>';
    }).join('');

    var explanation = _buildInvExplanation(t.crits);
    var explanationHtml = explanation
      ? '<div style="margin-top:12px;padding:10px 12px;background:var(--s2);border:1px solid var(--border);border-radius:6px;font-size:11px;color:var(--text2);line-height:1.7;">'+explanation+'</div>'
      : '';

    return '<div style="border:1px solid '+(isUser?t.color+'50':'var(--border)')+';border-left:3px solid '+leftColor+';border-radius:8px;margin-bottom:8px;overflow:hidden;background:var(--s1);">'+
      '<div onclick="toggleInvFit(\''+t.id+'\')" style="display:flex;align-items:center;gap:10px;padding:12px 14px;cursor:pointer;user-select:none;">'+
        '<div style="flex:1;min-width:0;">'+
          '<div style="font-size:12px;font-weight:700;color:var(--text);">'+t.name+
          (isUser?' <span style="font-size:9px;padding:1px 5px;background:'+t.color+'22;color:'+t.color+';border:1px solid '+t.color+'44;border-radius:3px;font-weight:600;">SİZİN TİPİNİZ</span>':'')+
          '</div>'+
          '<div style="font-size:10px;color:var(--muted2);margin-top:1px;">'+t.desc+'</div>'+
        '</div>'+
        '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">'+
          '<span style="font-size:11px;font-weight:700;color:'+scoreColor+';">'+passed+'/'+total+'</span>'+
          '<span style="color:var(--muted2);font-size:11px;" id="inv-fit-chevron-'+t.id+'">'+(isOpen?'▲':'▼')+'</span>'+
        '</div>'+
      '</div>'+
      '<div id="inv-fit-body-'+t.id+'" style="'+(isOpen?'':'display:none;')+'padding:0 14px 14px;border-top:1px solid var(--border);">'+
        '<div style="padding-top:10px;">'+critHtml+'</div>'+
        explanationHtml+
      '</div>'+
    '</div>';
  }).join('');
  el.innerHTML = html;
}

function toggleInvFit(id) {
  var body = document.getElementById('inv-fit-body-'+id);
  var chev = document.getElementById('inv-fit-chevron-'+id);
  if (!body) return;
  var hidden = body.style.display === 'none';
  body.style.display = hidden ? 'block' : 'none';
  if (chev) chev.textContent = hidden ? '▲' : '▼';
}

// ── Sektör Ortalaması Yükle ───────────────────────────────────────────────
function loadSectorAvg(sector, ex) {
  if (!sector || _sectorAvg !== null) { _renderSectorComparison(); return; }
  fetch('/api/fundamentals?symbol=_&exchange=' + encodeURIComponent(ex) + '&type=sector_avg&sector=' + encodeURIComponent(sector))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      _sectorAvg = data.avg || {};
      _sectorAvg._count = data.count || 0;
      _renderSectorComparison();
    })
    .catch(function() { _sectorAvg = {}; });
}

function _renderSectorComparison() {
  var d   = _prfData;
  var avg = _sectorAvg;
  if (!d || !avg) return;
  var el = document.getElementById('prf-sector-cmp');
  if (!el) return;

  // Tüm değerleri % birimine normalize et
  // _prfData: roe/roa/margin oran (0.505), TV avg: ham % (50.5)
  var s = {
    pe:    d.pe_ratio,
    pb:    d.price_book_ratio,
    ps:    d.price_sales,
    roe:   d.roe   != null ? d.roe   * 100 : null,
    roa:   d.roa   != null ? d.roa   * 100 : null,
    nm:    d.net_margin   != null ? d.net_margin   * 100 : null,
    gm:    d.gross_margin != null ? d.gross_margin * 100 : null,
    de:    d.debt_to_equity,
    cr:    d.current_ratio,
    div:   d.dividend_yield_recent != null ? d.dividend_yield_recent * 100 : null,
  };
  var a = {
    pe:  avg.pe,
    pb:  avg.pb,
    ps:  avg.ps,
    roe: avg.roe,
    roa: avg.roa,
    nm:  avg.netMargin,
    gm:  avg.grossMargin,
    de:  avg.debtToEquity,
    cr:  avg.currentRatio,
    div: avg.dividendYield,
  };

  function row(label, sv, av, fmt, higherBetter) {
    if (sv == null && av == null) return '';
    var fv  = function(v) { return v != null ? fmt(v) : '—'; };
    var diff = (sv != null && av != null && av !== 0) ? (sv - av) / Math.abs(av) * 100 : null;
    var good = diff != null && (higherBetter ? diff > 5  : diff < -5);
    var bad  = diff != null && (higherBetter ? diff < -5 : diff > 5);
    var badgeCls = good ? 'sc-g' : bad ? 'sc-b' : 'sc-n';
    var badgeTxt = diff != null ? (diff > 0 ? '+' : '') + diff.toFixed(0) + '%' : '—';
    return '<tr>' +
      '<td class="sc-lbl">'+ label +'</td>' +
      '<td class="sc-val">'+ fv(sv) +'</td>' +
      '<td class="sc-val sc-muted">'+ fv(av) +'</td>' +
      '<td><span class="sc-badge '+ badgeCls +'">'+ badgeTxt +'</span></td>' +
    '</tr>';
  }

  var x1  = function(v) { return v.toFixed(1)+'x'; };
  var x2  = function(v) { return v.toFixed(2)+'x'; };
  var pct = function(v) { return v.toFixed(1)+'%'; };
  var dec = function(v) { return v.toFixed(2); };

  var rows = [
    row('F/K',       s.pe,  a.pe,  x1,  false),
    row('PD/DD',     s.pb,  a.pb,  x2,  false),
    row('F/S',       s.ps,  a.ps,  x2,  false),
    row('ROE',       s.roe, a.roe, pct, true),
    row('ROA',       s.roa, a.roa, pct, true),
    row('Net Marj',  s.nm,  a.nm,  pct, true),
    row('Brüt Marj', s.gm,  a.gm,  pct, true),
    row('B/Ö',       s.de,  a.de,  dec, false),
    row('Cari Oran', s.cr,  a.cr,  dec, true),
    row('Temettü',   s.div, a.div, pct, true),
  ].filter(Boolean).join('');

  if (!rows) {
    el.innerHTML = '<p style="color:var(--muted);font-size:12px;padding:12px 0;">Veri yok.</p>';
    return;
  }

  var cnt = avg._count || 0;
  el.innerHTML =
    '<p class="sc-meta">'+ (d.sector||'') + (cnt ? ' &middot; '+ cnt +' şirket' : '') +'</p>'+
    '<table class="sc-tbl">'+
      '<colgroup><col/><col/><col/><col/></colgroup>'+
      '<thead><tr>'+
        '<th>Gösterge</th>'+
        '<th>Hisse</th>'+
        '<th>Sektör</th>'+
        '<th>Fark</th>'+
      '</tr></thead>'+
      '<tbody>'+ rows +'</tbody>'+
    '</table>';
}

function _buildFinancials(d) {
  if(!d) return;
  var n = function(v){ var x=Number(v); return isNaN(x)?null:x; };
  var pct = function(v){ return v!=null ? (v*100).toFixed(1)+'%' : '—'; };

  // Her metrik için eşik açıklamaları
  var TIPS = {
    'F/K (TTM)':      { g:'<15x — Ucuz değerlenmiş',   m:'15–25x — Makul fiyat',     b:'>25x — Pahalı veya zarar' },
    'PD/DD':          { g:'<2x — Defter değerine yakın', m:'2–4x — Ortalama',          b:'>4x — Değeri aşmış olabilir' },
    'F/S (TTM)':      { g:'<1x — Satışa göre ucuz',     m:'1–3x — Normal aralık',     b:'>3x — Satışa göre pahalı' },
    'PEG':            { g:'<1 — Büyümeye göre ucuz',    m:'1–2 — Adil fiyat',         b:'>2 — Büyümeye göre pahalı' },
    'Brüt Marj':      { g:'>%30 — Güçlü brüt kâr',     m:'%15–30 — Orta marj',       b:'<%15 — Zayıf brüt kâr' },
    'Net Marj':       { g:'>%12 — Yüksek net kâr',      m:'%5–12 — Kabul edilebilir', b:'<%5 — Düşük net kâr' },
    'ROE':            { g:'>%15 — Güçlü özsermaye getirisi', m:'%8–15 — Orta',        b:'<%8 — Düşük getiri' },
    'ROA':            { g:'>%8 — Varlıkları verimli kullanıyor', m:'%3–8 — Orta',     b:'<%3 — Varlık verimliliği düşük' },
    'Borç/Özsermaye': { g:'<0.5 — Düşük borç, az risk', m:'0.5–1 — Yönetilebilir',   b:'>1 — Yüksek kaldıraç' },
    'Cari Oran':      { g:'>2x — Güçlü likidite',       m:'1–2x — Yeterli',           b:'<1x — Kısa vadeli risk var' },
    'Temettü':        { g:'>%3 — Cazip temettü',        m:'%1–3 — Düşük-orta',        b:'' },
  };

  function dot(cls, label) {
    if(!cls) return '';
    var tip = (TIPS[label]||{})[cls] || '';
    return '<span class="fin-dot fin-dot-'+cls+'" title="'+tip+'" data-tip="'+tip.replace(/"/g,"'")+'"></span>';
  }
  function row(label, val, cls) {
    return '<tr><td class="fin-lbl">'+label+'</td><td class="fin-val">'+val+'</td><td class="fin-ind">'+dot(cls,label)+'</td></tr>';
  }
  function grp(title) {
    return '<tr class="fin-grp"><td colspan="3">'+title+'</td></tr>';
  }

  var pe  = n(d.pe_ratio), pb = n(d.price_book_ratio), ps = n(d.price_sales);
  var roe = n(d.roe), roa = n(d.roa), nm = n(d.net_margin), gm = n(d.gross_margin);
  var de  = n(d.debt_to_equity), cr = n(d.current_ratio);
  var div = n(d.dividend_yield_recent), peg = n(d.peg_ratio);

  var rows =
    grp('Değerleme') +
    row('F/K (TTM)',      pe  ? pe.toFixed(1)+'x'   : '—', pe&&pe<15&&pe>0?'g':pe&&pe<25?'m':pe?'b':'') +
    row('PD/DD',          pb  ? pb.toFixed(2)+'x'   : '—', pb&&pb<2&&pb>0?'g':pb&&pb<4?'m':pb?'b':'') +
    row('F/S (TTM)',      ps  ? ps.toFixed(2)+'x'   : '—', ps&&ps<1&&ps>0?'g':ps&&ps<3?'m':ps?'b':'') +
    row('PEG',            peg ? peg.toFixed(2)       : '—', peg&&peg>0&&peg<1?'g':peg&&peg<2?'m':peg?'b':'') +
    grp('Kârlılık') +
    row('Brüt Marj',      gm  ? pct(gm)  : '—', gm&&gm*100>30?'g':gm&&gm*100>15?'m':gm?'b':'') +
    row('Net Marj',       nm  ? pct(nm)  : '—', nm&&nm*100>12?'g':nm&&nm*100>5?'m':nm?'b':'') +
    row('ROE',            roe ? pct(roe) : '—', roe&&roe*100>15?'g':roe&&roe*100>8?'m':roe?'b':'') +
    row('ROA',            roa ? pct(roa) : '—', roa&&roa*100>8?'g':roa&&roa*100>3?'m':roa?'b':'') +
    grp('Borç & Likidite') +
    row('Borç/Özsermaye', de  ? de.toFixed(2)        : '—', de&&de<0.5?'g':de&&de<1?'m':de?'b':'') +
    row('Cari Oran',      cr  ? cr.toFixed(2)+'x'    : '—', cr&&cr>2?'g':cr&&cr>1?'m':cr?'b':'') +
    row('Temettü',        div ? (div*100).toFixed(2)+'%' : '—', div&&div*100>3?'g':div&&div*100>1?'m':'') +
    '';

  var legend =
    '<div class="fin-legend">'+
      '<span>Değerlendirme eşiği:</span>'+
      '<span class="fin-dot fin-dot-g"></span><span>İyi</span>'+
      '<span class="fin-dot fin-dot-m"></span><span>Orta</span>'+
      '<span class="fin-dot fin-dot-b"></span><span>Zayıf</span>'+
      '<span class="fin-legend-hint">— üzerine gelin</span>'+
    '</div>';

  var tbl =
    legend +
    '<table class="fin-tbl">'+
      '<colgroup><col style="width:55%"/><col style="width:35%"/><col style="width:10%"/></colgroup>'+
      '<tbody>'+rows+'</tbody>'+
    '</table>';

  var finSum = document.getElementById('prf-fin-summary');
  if(finSum){ finSum.style.cssText='margin-bottom:0'; finSum.innerHTML=tbl; }
  var finGauge = document.getElementById('prf-fin-gauges');
  if(finGauge){ var _fg=finGauge.closest('.prf-section'); if(_fg) _fg.style.display='none'; }
  var finDebt = document.getElementById('prf-fin-debt');
  if(finDebt){ var _fd=finDebt.closest('.prf-section'); if(_fd) _fd.style.display='none'; }

  // Tooltip - native title yeterli değilse özel tooltip
  if (finSum) {
    var _ttRaf = null;
    finSum.addEventListener('mousemove', function(e) {
      var dot = e.target.closest ? e.target.closest('.fin-dot[data-tip]') : null;
      if (!dot) return;
      if (_ttRaf) return;
      _ttRaf = requestAnimationFrame(function() {
        _ttRaf = null;
        var tt = document.getElementById('fin-tt');
        if (tt) { tt.style.left=(e.clientX+12)+'px'; tt.style.top=(e.clientY-8)+'px'; }
      });
    });
    finSum.addEventListener('mouseover', function(e) {
      var dot = e.target.closest ? e.target.closest('.fin-dot[data-tip]') : null;
      if (!dot) return;
      var tip = dot.getAttribute('data-tip');
      if (!tip) return;
      var tt = document.getElementById('fin-tt');
      if (!tt) { tt=document.createElement('div'); tt.id='fin-tt'; tt.className='fin-tt'; document.body.appendChild(tt); }
      tt.textContent = tip;
      tt.style.display = 'block';
    });
    finSum.addEventListener('mouseout', function(e) {
      var dot = e.target.closest ? e.target.closest('.fin-dot[data-tip]') : null;
      if (!dot) return;
      var tt = document.getElementById('fin-tt');
      if (tt) tt.style.display = 'none';
    });
  }
}


function goAnaliz() {
  window.location.href = '/analiz/';
}

function goHome() { window.location.href = '/'; }

function goScreener() {
  window.location.href = '/?from=profile';
}
function closeProfil() {
  var from = new URLSearchParams(window.location.search).get('from');
  if (from === 'analiz') {
    window.location.href = '/analiz/';
  } else {
    // from=screener veya bilinmeyen → screener'a dön
    window.location.href = '/?from=profile';
  }
}
function onHemenAl(sym, ex) { showToast(sym + ' — Broker entegrasyonu yakında!'); }
function showToast(msg) {
  var t = document.getElementById('df-toast');
  if(!t) { t = document.createElement('div'); t.id='df-toast';
    t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a1a1a;border:1px solid #2a2a2a;color:#ededed;font-size:12px;padding:10px 20px;border-radius:8px;z-index:9999;opacity:0;transition:opacity .2s;white-space:nowrap;font-family:Inter,sans-serif;';
    document.body.appendChild(t); }
  t.textContent=msg; t.style.opacity='1';
  clearTimeout(t._t); t._t=setTimeout(function(){t.style.opacity='0';},3000);
}



var EXCHANGE_META = {
  bist:   { name: 'BIST',    currency: '₺', currencyCode: 'TRY', symSuffix: '.IS', flag: '🇹🇷',  filters: [] },
  nasdaq: { name: 'NASDAQ',  currency: '$',  currencyCode: 'USD', symSuffix: '',    flag: '🇺🇸', filters: [{ left: 'exchange', operation: 'equal', right: 'NASDAQ' }] },
  sp500:  { name: 'S&P 500', currency: '$',  currencyCode: 'USD', symSuffix: '',    flag: '🇺🇸', filters: [] },
  dax:    { name: 'DAX',     currency: '€',  currencyCode: 'EUR', symSuffix: '.DE', flag: '🇩🇪', filters: [] },
  lse:    { name: 'LSE',     currency: '£',  currencyCode: 'GBP', symSuffix: '.L',  flag: '🇬🇧',      filters: [] },
  nikkei: { name: 'Nikkei',  currency: '¥',  currencyCode: 'JPY', symSuffix: '.T',  flag: '🇯🇵',   filters: [] },
  nyse:   { name: 'NYSE',   currency: '$',  currencyCode: 'USD', symSuffix: '',    flag: '🇺🇸', filters: [{ left: 'exchange', operation: 'equal', right: 'NYSE' }] },
  krx:    { name: 'KRX',   currency: '₩',  currencyCode: 'KRW', symSuffix: '.KS', flag: '🇰🇷',   filters: [] },
  moex:   { name: 'MOEX',  currency: '₽',  currencyCode: 'RUB', symSuffix: '.ME', flag: '🇷🇺',  filters: [] },
  france:    { name: 'Euronext Paris',     currency: '€', currencyCode: 'EUR', symSuffix: '.PA', flag: '🇫🇷',       filters: [] },
  amsterdam: { name: 'Euronext Amsterdam', currency: '€', currencyCode: 'EUR', symSuffix: '.AS', flag: '🇳🇱', filters: [] },
  brussels:  { name: 'Euronext Brussels',  currency: '€', currencyCode: 'EUR', symSuffix: '.BR', flag: '🇧🇪',      filters: [] },
  lisbon:    { name: 'Euronext Lisbon',    currency: '€', currencyCode: 'EUR', symSuffix: '.LS', flag: '🇵🇹',    filters: [] },
  dublin:    { name: 'Euronext Dublin',   currency: '€', currencyCode: 'EUR', symSuffix: '.IR', flag: '🇮🇪',     filters: [] },
  oslo:      { name: 'Oslo Bors',         currency: 'kr', currencyCode: 'NOK', symSuffix: '.OL', flag: '🇳🇴',      filters: [] },
  milan:     { name: 'Borsa Italiana',    currency: '€', currencyCode: 'EUR', symSuffix: '.MI', flag: '🇮🇹',       filters: [] },
  tsx:       { name: 'TSX',              currency: 'C$', currencyCode: 'CAD', symSuffix: '.TO', flag: '🇨🇦',     filters: [] },
  twse:      { name: 'TWSE',             currency: 'NT$', currencyCode: 'TWD', symSuffix: '.TW', flag: '🇹🇼',     filters: [] },
  b3:        { name: 'B3',              currency: 'R$',  currencyCode: 'BRL', symSuffix: '.SA', flag: '🇧🇷',     filters: [] },
  hkex:      { name: 'HKEX',           currency: 'HK$', currencyCode: 'HKD', symSuffix: '.HK', flag: '🇭🇰',  filters: [] },
  china:     { name: 'SSE/SZSE',       currency: '¥',   currencyCode: 'CNY', symSuffix: '.SS', flag: '🇨🇳',       filters: [] },
  saudi:       { name: 'Tadawul',        currency: '﷼',   currencyCode: 'SAR', symSuffix: '.SR', flag: '🇸🇦', filters: [] },
  switzerland: { name: 'SIX',            currency: 'Fr',  currencyCode: 'CHF', symSuffix: '.SW', flag: '🇨🇭',    filters: [] },
  australia:   { name: 'ASX',            currency: 'A$',  currencyCode: 'AUD', symSuffix: '.AX', flag: '🇦🇺',       filters: [] },
  southafrica: { name: 'JSE',            currency: 'R',   currencyCode: 'ZAR', symSuffix: '.JO', flag: '🇿🇦',    filters: [] },
  sweden:      { name: 'Nasdaq Stockholm', currency: 'kr', currencyCode: 'SEK', symSuffix: '.ST', flag: '🇸🇪',           filters: [] },
  india:       { name: 'NSE',            currency: '₹',   currencyCode: 'INR', symSuffix: '.NS', flag: '🇮🇳',            filters: [] },
  uae:         { name: 'DFM/ADX',        currency: 'د.إ', currencyCode: 'AED', symSuffix: '.DU', flag: '🇦🇪',              filters: [] },
};

var allData = [];
var currentExchange = 'bist';
var _prfSym = '';
var _prfEx  = '';
var _prfData = null;
var _sectorAvg = null;
var _urlParams = new URLSearchParams(window.location.search);
var _fxRates = { TRY: 44.6, EUR: 0.920, GBP: 0.790, JPY: 150.0, KRW: 1350.0, RUB: 89.0, NOK: 10.7, CAD: 1.37, TWD: 32.0, BRL: 5.70, HKD: 7.78, CNY: 7.25, SAR: 3.75, CHF: 0.895, AUD: 1.58, ZAR: 18.5 }; // fallback, sayfa yüklenince /api/rates ile güncellenir
fetch('/api/rates').then(function(r){ return r.json(); }).then(function(d){ if(d && d.TRY) _fxRates = d; }).catch(function(){});

function _fmtN(v) {
  if(!v || isNaN(v)) return '—';
  if(Math.abs(v)>=1e12) return (v/1e12).toFixed(1)+'T';
  if(Math.abs(v)>=1e9)  return (v/1e9).toFixed(1)+'B';
  if(Math.abs(v)>=1e6)  return (v/1e6).toFixed(1)+'M';
  return parseFloat(v).toFixed(2);
}

// Borsanın yerel kuru: 1 USD kaç yerel birim (_fxRates ham /api/rates formatı)
function _localRate(ex) {
  var meta = EXCHANGE_META[ex || _prfEx] || EXCHANGE_META.bist;
  var code = meta.currencyCode || 'USD';
  if (code === 'USD') return 1;
  return _fxRates[code] || null;
}

// Piyasa değeri çift gösterim: yerel + USD. Girdi: milyon USD.
function _mcapDual(vUsdM) {
  if(!vUsdM || isNaN(vUsdM)) return '—';
  var meta = EXCHANGE_META[_prfEx] || EXCHANGE_META.bist;
  var usdStr = '$' + _fmtN(vUsdM * 1e6);
  var rate = _localRate(_prfEx);
  if (!rate || rate === 1) return usdStr;
  return (meta.currency || '') + ' ' + _fmtN(vUsdM * rate * 1e6) + ' / ' + usdStr;
}

function _setScore(id, val, cls) {
  var el = document.getElementById(id);
  if(el){ el.textContent=val; el.className='prf-score-val '+(cls||''); }
}

// ── DeepFin Skoru ────────────────────────────────────────────────────────
var _DF_W_KEY = 'df_score_weights';
var _DF_W_DEF = { temel: 35, teknik: 25, deger: 25, mom: 15 };

function _dfW(save) {
  if (save) { localStorage.setItem(_DF_W_KEY, JSON.stringify(save)); return save; }
  try {
    var s = JSON.parse(localStorage.getItem(_DF_W_KEY) || 'null');
    if (s && typeof s.temel === 'number') return s;
  } catch(e) {}
  return { temel: 35, teknik: 25, deger: 25, mom: 15 };
}

function _sRange(val, bad, good) {
  if (val == null || isNaN(val)) return null;
  if (good === bad) return 50;
  return Math.max(0, Math.min(100, (val - bad) / (good - bad) * 100));
}
function _sInv(val, cheap, expensive) { return _sRange(val, expensive, cheap); }

function _calcDFScore(d) {
  if (!d) return null;
  var n = function(v) { return (v != null && !isNaN(+v)) ? +v : null; };

  // Temel
  var roe = n(d.roe);
  var nm  = n(d.net_margin);
  var gm  = n(d.gross_margin);
  var rg  = n(d.total_revenue_change_ttm_yoy != null ? d.total_revenue_change_ttm_yoy : d.revenue_growth_ttm_yoy);
  var eg  = n(d.earnings_per_share_change_ttm_yoy != null ? d.earnings_per_share_change_ttm_yoy : d.eps_growth_ttm_yoy);
  var fs  = n(d.piotroski_f_score);
  var tp  = [];
  if (roe != null) tp.push(_sRange(roe * 100, 0, 25));
  if (nm  != null) tp.push(_sRange(nm  * 100, 0, 15));
  if (gm  != null) tp.push(_sRange(gm  * 100, 10, 45));
  if (rg  != null) tp.push(_sRange(rg,  -10, 25));
  if (eg  != null) tp.push(_sRange(eg,  -10, 30));
  if (fs  != null) tp.push(fs / 9 * 100);
  var sTemel = tp.length ? tp.reduce(function(a,b){return a+b;},0)/tp.length : null;

  // Teknik (perf-based, tech rating not always available)
  var p1m = n(d.Perf_1M != null ? d.Perf_1M : d.perf1M);
  var pw  = n(d.Perf_W  != null ? d.Perf_W  : d.perfW);
  var py  = n(d.Perf_Y  != null ? d.Perf_Y  : d.perfY);
  var tk  = [];
  if (p1m != null) tk.push(_sRange(p1m, -20, 20));
  if (pw  != null) tk.push(_sRange(pw,  -10, 15));
  if (py  != null) tk.push(_sRange(py,  -30, 60) * 0.5);
  var sTeknik = tk.length ? Math.max(0, Math.min(100, tk.reduce(function(a,b){return a+b;},0)/tk.length)) : null;

  // Değerleme
  var pe  = n(d.pe_ratio);
  var pb  = n(d.price_book_ratio);
  var ps  = n(d.price_sales);
  var vp  = [];
  if (pe != null && pe > 0)  vp.push(_sInv(pe,  8, 50));
  if (pb != null && pb > 0)  vp.push(_sInv(pb,  1,  6));
  if (ps != null && ps > 0)  vp.push(_sInv(ps, 0.5, 10));
  var sDeger = vp.length ? vp.reduce(function(a,b){return a+b;},0)/vp.length : null;

  // Momentum
  var mp = [];
  if (pw  != null) mp.push(_sRange(pw,  -10, 15));
  if (p1m != null) mp.push(_sRange(p1m, -15, 20));
  if (py  != null) mp.push(_sRange(py,  -20, 50));
  var sMom = mp.length ? mp.reduce(function(a,b){return a+b;},0)/mp.length : null;

  // Weighted total
  var w = _dfW();
  var total = 0, wSum = 0;
  [{ s: sTemel, wk:'temel' }, { s: sTeknik, wk:'teknik' }, { s: sDeger, wk:'deger' }, { s: sMom, wk:'mom' }]
    .forEach(function(c) { if (c.s != null) { total += c.s * w[c.wk]; wSum += w[c.wk]; } });

  return {
    total:  wSum > 0 ? Math.round(total / wSum) : null,
    temel:  sTemel  != null ? Math.round(sTemel)  : null,
    teknik: sTeknik != null ? Math.round(sTeknik) : null,
    deger:  sDeger  != null ? Math.round(sDeger)  : null,
    mom:    sMom    != null ? Math.round(sMom)     : null,
  };
}

function _dfScoreColor(v) {
  if (v == null) return 'var(--muted)';
  if (v >= 70) return '#00c076';
  if (v >= 50) return '#f0b429';
  return '#f6465d';
}

function _dfScoreLbl(v) {
  if (v == null) return 'Veri Yok';
  if (v >= 75) return 'Güçlü';
  if (v >= 60) return 'İyi';
  if (v >= 45) return 'Orta';
  return 'Zayıf';
}

function _buildDeepFinScore() {
  var sc  = _calcDFScore(_prfData);
  var w   = _dfW();
  var CIRC = 251.3;
  var arcEl = document.getElementById('df-sc-arc');
  var numEl = document.getElementById('df-sc-num');
  var lblEl = document.getElementById('df-sc-sublbl');

  if (sc && sc.total != null) {
    var col = _dfScoreColor(sc.total);
    if (arcEl) { arcEl.style.strokeDashoffset = (CIRC * (1 - sc.total / 100)).toFixed(1); arcEl.style.stroke = col; }
    if (numEl) { numEl.textContent = sc.total; numEl.style.color = col; }
    if (lblEl) { lblEl.textContent = _dfScoreLbl(sc.total); }
  } else {
    if (arcEl) { arcEl.style.strokeDashoffset = CIRC; arcEl.style.stroke = 'var(--muted)'; }
    if (numEl) { numEl.textContent = '—'; numEl.style.color = 'var(--muted)'; }
    if (lblEl) { lblEl.textContent = _prfData ? 'Yetersiz Veri' : 'Bekliyor'; }
  }

  var subsEl = document.getElementById('df-sc-subs');
  if (subsEl) {
    var subs = [
      { lbl:'Temel',     v: sc ? sc.temel  : null, wk:'temel'  },
      { lbl:'Teknik',    v: sc ? sc.teknik : null, wk:'teknik' },
      { lbl:'Değerleme', v: sc ? sc.deger  : null, wk:'deger'  },
      { lbl:'Momentum',  v: sc ? sc.mom    : null, wk:'mom'    },
    ];
    subsEl.innerHTML = subs.map(function(s) {
      var col  = _dfScoreColor(s.v);
      var barW = s.v != null ? s.v + '%' : '0%';
      return '<div class="df-sc-sub-row">'+
        '<span class="df-sc-sub-lbl">'+s.lbl+'</span>'+
        '<div class="df-sc-sub-track"><div class="df-sc-sub-fill" style="width:'+barW+';background:'+col+'"></div></div>'+
        '<span class="df-sc-sub-val" style="color:'+col+'">'+(s.v != null ? s.v : '—')+'</span>'+
        '<span class="df-sc-sub-w">%'+w[s.wk]+'</span>'+
      '</div>';
    }).join('');
  }

  _dfUpdateSliders(w);
}

function _dfUpdateSliders(w) {
  ['temel','teknik','deger','mom'].forEach(function(k) {
    var sl = document.getElementById('dfs-' + k);
    var vl = document.getElementById('dfsv-' + k);
    if (sl) sl.value = w[k];
    if (vl) vl.textContent = w[k] + '%';
  });
}

function toggleDfScoreSliders() {
  var el = document.getElementById('df-sc-sliders');
  if (!el) return;
  var hidden = el.style.display === 'none' || !el.style.display;
  el.style.display = hidden ? 'block' : 'none';
  if (hidden) _dfUpdateSliders(_dfW());
}

function onDfSlider(key, rawVal) {
  var val  = parseInt(rawVal, 10);
  var w    = _dfW();
  var keys = ['temel','teknik','deger','mom'];
  var others = keys.filter(function(k) { return k !== key; });
  var otherSum = others.reduce(function(s, k) { return s + (w[k] || 0); }, 0);
  var remain   = 100 - val;
  if (remain <= 0 || otherSum <= 0) {
    others.forEach(function(k) { w[k] = 0; });
  } else {
    var used = 0;
    others.forEach(function(k, i) {
      if (i < others.length - 1) {
        w[k] = Math.round((w[k] / otherSum) * remain);
        used += w[k];
      }
    });
    w[others[others.length - 1]] = remain - used;
    others.forEach(function(k) { w[k] = Math.max(0, w[k]); });
  }
  w[key] = val;
  _dfW(w);
  _dfUpdateSliders(w);
  _buildDeepFinScore();
}

function showProfil(sym, ex) {
  _prfSym = sym;
  _prfEx  = ex || 'bist';
  _fundCache = {}; // yeni hisse için cache temizle

  var exMeta = EXCHANGE_META[_prfEx] || {};
  var bcEx = document.getElementById('prf-bc-ex');
  var bcSym = document.getElementById('prf-bc-sym');
  if(bcEx)  bcEx.textContent  = (exMeta.name || _prfEx).toUpperCase();
  if(bcSym) bcSym.textContent = sym.toUpperCase();

  document.getElementById('prf-sym-tag').textContent = sym;
  document.getElementById('prf-ex-tag').textContent  = (exMeta.name || _prfEx).toUpperCase();
  // TV logo CDN: BIST için TUPRS → BIST:TUPRS → logo slug
  var _logoEl = document.getElementById('prf-logo');
  if(_logoEl) {
    // Sembol logo CDN - birden fazla format denenir
    var _tvPfxMap = { bist:'BIST', nasdaq:'NASDAQ', sp500:'NYSE', dax:'XETR', lse:'LSE', nikkei:'TSE', krx:'KRX', moex:'MOEX', france:'EURONEXT', amsterdam:'EURONEXT', brussels:'EURONEXT', lisbon:'EURONEXT', dublin:'EURONEXT', oslo:'OSE', milan:'MTA', tsx:'TSX', twse:'TWSE', b3:'BMFBOVESPA', hkex:'HKEX', china:'SSE', saudi:'TADAWUL', switzerland:'SIX', australia:'ASX', southafrica:'JSE', sweden:'NASDAQ', india:'NSE', uae:'DFM' };
    var _tvPfx = _tvPfxMap[_prfEx] || 'BIST';
    var _symLow = sym.toLowerCase();
    // TV logo URL formatları (öncelik sırasıyla):
    // 1. exchange/symbol--big.svg  2. symbol--big.svg  3. Clearbit domain
    var _logoUrls = [
      'https://s3-symbol-logo.tradingview.com/' + _tvPfx.toLowerCase() + '/' + _symLow + '--big.svg',
      'https://s3-symbol-logo.tradingview.com/' + _symLow + '--big.svg',
    ];
    var _logoTry = 0;
    var _img = document.createElement('img');
    _img.alt = sym;
    _img.style.cssText = 'width:40px;height:40px;object-fit:contain;';
    _img.onerror = function() {
      _logoTry++;
      if (_logoTry < _logoUrls.length) {
        _img.src = _logoUrls[_logoTry];
      } else {
        // Fallback: renkli harf avatar
        _logoEl.innerHTML = '';
        _logoEl.textContent = sym.substring(0, 2).toUpperCase();
        _logoEl.style.cssText = 'display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;';
      }
    };
    _img.onload = function() {
      _logoEl.style.background = 'transparent';
      _logoEl.style.border = 'none';
    };
    _img.src = _logoUrls[0];
    _logoEl.innerHTML = '';
    _logoEl.appendChild(_img);
  }
  document.getElementById('prf-fullname').textContent = sym;

  var buyBtn = document.getElementById('prf-buy-btn');
  if(buyBtn) buyBtn.onclick = function(){ onHemenAl(sym, _prfEx); };

  _prfData = allData.find(function(x){
    var s = (x.symbol||'').replace('.IS','').toUpperCase();
    return s === sym.toUpperCase() || (x.symbol||'').toUpperCase() === sym.toUpperCase()+'.IS';
  });

  _buildPrfHero();
  _buildPrfMetrics();
  _buildSadeView();
  requestAnimationFrame(function(){
    _buildPrfPiotroski();
    _buildDeepFinScore();
    _buildTrend(_prfData);
    _renderInvestorFit(_prfData);
    setTimeout(function(){
      _buildPrfGuru();
      _buildPrfSide();
      _buildFinancials(_prfData);
    }, 0);
  });
  // RAF: browser layout tamamlandıktan sonra chart çiz
  requestAnimationFrame(function() {
    setTimeout(function() { loadTVWidget(sym, ex); }, 50);
  });
}

function _buildPrfHero() {
  var d = _prfData;
  if(!d) return;
  var exMeta = EXCHANGE_META[_prfEx] || EXCHANGE_META.bist;
  var cur = exMeta.currency || '₺';

  var price = d.close || d.price || 0;
  var chgPct = d.change_abs || 0;
  document.getElementById('prf-price').textContent = price
    ? cur+' '+price.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})
    : '—';
  var chgEl = document.getElementById('prf-chg');
  if(chgPct) {
    var sign = chgPct >= 0 ? '+' : '';
    chgEl.textContent = sign+(d.change||0).toFixed(2)+' ('+sign+chgPct.toFixed(2)+'%)';
    chgEl.className = 'prf-chg '+(chgPct>=0?'up':'dn');
  }

  var pe = d.pe_ratio, peg = d.peg_ratio, roe = d.roe, fs = d.piotroski_f_score, mc = d.market_cap_basic;
  _setScore('prf-sc-fscore', fs!==undefined&&fs!==null ? fs+'/9' : '—', fs>=7?'g':fs>=4?'m':'b');
  _setScore('prf-sc-peg', peg ? peg.toFixed(2) : '—', peg&&peg<1?'g':peg&&peg<2?'m':'b');
  _setScore('prf-sc-fk',  pe  ? pe.toFixed(1)+'x' : '—', pe&&pe<15?'g':pe&&pe<25?'m':'b');
  _setScore('prf-sc-roe', roe ? (roe*100).toFixed(1)+'%' : '—', roe&&roe*100>15?'g':roe&&roe*100>8?'m':'b');
  var mcTxt = '—';
  if (mc) {
    if (_prfEx === 'bist') {
      var mcUsd = (mc * 1e6) / (_fxRates.TRY || 44.6);
      mcTxt = '₺ ' + _fmtN(mc*1e6) + ' / $' + _fmtN(mcUsd);
    } else {
      var exMetaMc = EXCHANGE_META[_prfEx] || EXCHANGE_META.bist;
      mcTxt = exMetaMc.currency + ' ' + _fmtN(mc*1e6);
    }
  }
  _setScore('prf-sc-mc', mcTxt, '');

  if(d.sector) document.getElementById('prf-sector-tag').textContent = d.sector;
  if(d.name)   document.getElementById('prf-fullname').textContent   = d.name;
}

function _buildPrfMetrics() {
  var d = _prfData;
  if(!d) return;
  var metrics = [
    {l:'F/K (TTM)',      v:d.pe_ratio,             fmt:function(v){return v.toFixed(1)+'x';},  cls:function(v){return v>0&&v<15?'g':v<25?'m':'b';}, sub:'Piyasa/Kazanç'},
    {l:'PD/DD',          v:d.price_book_ratio,      fmt:function(v){return v.toFixed(2)+'x';},  cls:function(v){return v>0&&v<2?'g':v<4?'m':'b';},  sub:'Defter değeri'},
    {l:'ROE',            v:d.roe,                   fmt:function(v){return (v*100).toFixed(1)+'%';}, cls:function(v){return v*100>15?'g':v*100>8?'m':'b';}, sub:'Özsermaye getirisi'},
    {l:'ROA',            v:d.roa,                   fmt:function(v){return (v*100).toFixed(1)+'%';}, cls:function(v){return v*100>8?'g':v*100>3?'m':'b';},  sub:'Varlık getirisi'},
    {l:'Net Marj',       v:d.net_margin,            fmt:function(v){return (v*100).toFixed(1)+'%';}, cls:function(v){return v*100>12?'g':v*100>5?'m':'b';}, sub:'Kar/gelir oranı'},
    {l:'Brüt Marj',      v:d.gross_margin,          fmt:function(v){return (v*100).toFixed(1)+'%';}, cls:function(v){return v*100>40?'g':v*100>20?'m':'b';},sub:'Ham kârlılık'},
    {l:'PEG',            v:d.peg_ratio,             fmt:function(v){return v.toFixed(2);},       cls:function(v){return v>0&&v<1?'g':v<2?'m':'b';},  sub:'Büyümeye göre F/K'},
    {l:'F-Score',        v:d.piotroski_f_score,     fmt:function(v){return v+'/9';},              cls:function(v){return v>=7?'g':v>=4?'m':'b';},     sub:'Finansal sağlık'},
    {l:'Cari Oran',      v:d.current_ratio,         fmt:function(v){return v.toFixed(2)+'x';},  cls:function(v){return v>2?'g':v>1?'m':'b';},        sub:'Dönen/kısa borç'},
    {l:'Borç/Öz',        v:d.debt_to_equity,        fmt:function(v){return v.toFixed(2);},       cls:function(v){return v<0.5?'g':v<1?'m':'b';},     sub:'Finansal kaldıraç'},
    {l:'Temettü Verimi', v:d.dividend_yield_recent, fmt:function(v){return (v*100).toFixed(2)+'%';}, cls:function(v){return v*100>3?'g':v*100>1?'m':'b';}, sub:'Yıllık temettü'},
    {l:'Haftalık Değ.',  v:d.Perf_W,                fmt:function(v){return (v>=0?'+':'')+v.toFixed(2)+'%';}, cls:function(v){return v>0?'g':'b';}, sub:'7 günlük performans'},
  ];
  document.getElementById('prf-metrics').innerHTML = metrics.map(function(m){
    var ok = m.v!==null && m.v!==undefined && !isNaN(m.v) && m.v!==0;
    return '<div class="prf-mcell"><div class="prf-mlabel">'+m.l+'</div><div class="prf-mval '+(ok?m.cls(m.v):'')+'">'+(ok?m.fmt(m.v):'—')+'</div><div class="prf-msub">'+m.sub+'</div></div>';
  }).join('');
}

function _buildPrfPiotroski() {
  if (!document.getElementById('prf-fscore-num')) return;
  var d = _prfData;
  var score = d ? d.piotroski_f_score : null;
  if(score===null||score===undefined) { document.getElementById('prf-fscore-num').textContent='—'; return; }
  document.getElementById('prf-fscore-num').textContent = score;
  document.getElementById('prf-fscore-label').textContent = score>=8?'Güçlü Bilanço':score>=5?'Orta Güç':'Zayıf';
  var groups = [
    {title:'Karlılık', items:[
      {t:'Pozitif ROA',             p:d.roa>0},
      {t:'Pozitif Nakit Akışı',     p:d.cash_f_operating_activities>0},
      {t:'Artan ROA (YoY)',         p:score>=5},
      {t:'Nakit Akışı > Net Gelir', p:score>=6},
    ]},
    {title:'Kaldıraç & Likidite', items:[
      {t:'Azalan Uzun Vadeli Borç', p:d.debt_to_equity<1},
      {t:'Artan Cari Oran',         p:d.current_ratio>1.5},
      {t:'Hisse Dilüsyonu Yok',     p:score>=7},
    ]},
    {title:'Verimlilik', items:[
      {t:'Artan Brüt Marj',         p:d.gross_margin>0.2},
      {t:'Artan Varlık Devir Hızı', p:score>=8},
    ]},
  ];
  document.getElementById('prf-fgrid').innerHTML = groups.map(function(g){
    return '<div class="prf-fgroup"><div class="prf-fgroup-title">'+g.title+'</div>'+
      g.items.map(function(i){return '<div class="prf-fitem"><div class="prf-fdot '+(i.p?'p':'f')+'"></div>'+i.t+'</div>';}).join('')+'</div>';
  }).join('');
}

function _prfGuruDefs(d) {
  var pe=d.pe_ratio, pb=d.price_book_ratio, roe=(d.roe||0)*100, nm=(d.net_margin||0)*100;
  var cr=d.current_ratio, de=d.debt_to_equity, peg=d.peg_ratio, dy=(d.dividend_yield_recent||0)*100, fs=d.piotroski_f_score||0;
  return [
    {name:'Warren Buffett', short:'Buffett', sub:'Değer Yatırımı', crits:[
      {t:'F/K < 20 → '+(pe?pe.toFixed(1)+'x':'—'),  p:pe&&pe>0&&pe<20},
      {t:'ROE > 15% → '+roe.toFixed(1)+'%',           p:roe>15},
      {t:'Net Marj > 10% → '+nm.toFixed(1)+'%',       p:nm>10},
      {t:'Cari Oran > 1.2 → '+(cr?cr.toFixed(2):'—'),p:cr&&cr>1.2},
      {t:'Borç/Öz < 0.8 → '+(de?de.toFixed(2):'—'), p:de!==undefined&&de<0.8},
    ]},
    {name:'Peter Lynch – PEG', short:'Lynch (PEG)', sub:'Büyüme + Değer', crits:[
      {t:'PEG < 1 → '+(peg?peg.toFixed(2):'—'),      p:peg&&peg>0&&peg<1},
      {t:'F/K < 30 → '+(pe?pe.toFixed(1)+'x':'—'),   p:pe&&pe>0&&pe<30},
      {t:'ROE > 12% → '+roe.toFixed(1)+'%',            p:roe>12},
    ]},
    {name:'Benjamin Graham', short:'Graham', sub:'Derin Değer', crits:[
      {t:'F/K < 15 → '+(pe?pe.toFixed(1)+'x':'—'),   p:pe&&pe>0&&pe<15},
      {t:'PD/DD < 1.5 → '+(pb?pb.toFixed(2)+'x':'—'),p:pb&&pb<1.5},
      {t:'Cari > 2 → '+(cr?cr.toFixed(2)+'x':'—'),   p:cr&&cr>2},
      {t:'Temettü > 1% → '+dy.toFixed(1)+'%',          p:dy>1},
    ]},
    {name:'Piotroski F-Score', short:'Piotroski', sub:'Finansal Sağlık', crits:[
      {t:'Karlılık 4/4', p:fs>=6},
      {t:'Kaldıraç 3/3', p:fs>=8},
      {t:'Verimlilik 2/2',p:fs>=7},
    ]},
    {name:'George Soros', short:'Soros', sub:'Reflexivity', crits:[
      {t:'3A Getiri > 10% → '+(d.perf3m!=null?d.perf3m.toFixed(1)+'%':'—'),                                          p:d.perf3m!=null&&d.perf3m>10},
      {t:'6A Getiri > 15% → '+(d.perf6m!=null?d.perf6m.toFixed(1)+'%':'—'),                                          p:d.perf6m!=null&&d.perf6m>15},
      {t:'Gelir Büyümesi > 15% → '+(d.revenueGrowthTTMYoy!=null?d.revenueGrowthTTMYoy.toFixed(1)+'%':'—'),           p:d.revenueGrowthTTMYoy!=null&&d.revenueGrowthTTMYoy>15},
      {t:'Kazanç Büyümesi > 10% → '+(d.epsGrowthTTMYoy!=null?d.epsGrowthTTMYoy.toFixed(1)+'%':'—'),                  p:d.epsGrowthTTMYoy!=null&&d.epsGrowthTTMYoy>10},
    ]},
    {name:'Ray Dalio', short:'Dalio', sub:'All Weather', crits:[
      {t:'F/K < 25 → '+(pe?pe.toFixed(1)+'x':'—'),      p:pe&&pe>0&&pe<25},
      {t:'Temettü > 2% → '+dy.toFixed(1)+'%',            p:dy>2},
      {t:'Borç/Öz < 60% → '+(de?de.toFixed(1)+'%':'—'), p:de!==undefined&&de<60},
      {t:'Cari Oran > 1.3 → '+(cr?cr.toFixed(2):'—'),   p:cr&&cr>1.3},
      {t:'Net Marj > 8% → '+nm.toFixed(1)+'%',           p:nm>8},
      {t:'ROE > 10% → '+roe.toFixed(1)+'%',              p:roe>10},
    ]},
    {name:'Howard Marks', short:'Marks', sub:'Risk Yönetimi', crits:[
      {t:'F/K < 18 → '+(pe?pe.toFixed(1)+'x':'—'),      p:pe&&pe>0&&pe<18},
      {t:'PD/DD < 2 → '+(pb?pb.toFixed(2)+'x':'—'),     p:pb&&pb<2},
      {t:'Borç/Öz < 80% → '+(de?de.toFixed(1)+'%':'—'), p:de!==undefined&&de<80},
      {t:'Cari Oran > 1.2 → '+(cr?cr.toFixed(2):'—'),   p:cr&&cr>1.2},
      {t:'Net Marj > 8% → '+nm.toFixed(1)+'%',           p:nm>8},
    ]},
  ];
}

function _buildPrfGuru() {
  var d = _prfData;
  if(!d) { document.getElementById('prf-ggrid').innerHTML='<div style="color:var(--muted);font-size:12px;padding:10px">Tarama yapıp Detaylı Analiz&#39;e tıklayın</div>'; return; }
  var gurus = _prfGuruDefs(d);
  document.getElementById('prf-ggrid').innerHTML = gurus.map(function(g){
    var passed=g.crits.filter(function(c){return c.p;}).length, total=g.crits.length, pct=passed/total;
    var cls=pct>=0.8?'pass':pct>=0.5?'partial':'fail';
    return '<div class="prf-gcard '+cls+'">'+
      '<div class="prf-gtop">'+
      '<div><div style="font-size:12px;font-weight:700;color:var(--text)">'+g.name+'</div>'+
      '<div style="font-size:10px;color:var(--text2)">'+g.sub+'</div></div>'+
      '<span class="prf-gscore '+cls+'">'+passed+'/'+total+'</span></div>'+
      g.crits.map(function(c){return '<div class="prf-gcrit"><div class="prf-cdot" style="background:'+(c.p?'var(--green)':'var(--red)')+'"></div>'+c.t+'</div>';}).join('')+'</div>';
  }).join('');
}

// ── Sade görünüm: strateji uygunluk % çubukları, 6 metrik, rozetler ──
function renderStrategyCompat() {
  var el = document.getElementById('prf-compat');
  if (!el) return;
  var d = _prfData;
  if (!d) { el.innerHTML = '<div style="padding:12px 0;color:var(--muted);font-size:12px;">Veri yok.</div>'; return; }
  var scored = _prfGuruDefs(d).map(function(g){
    var passed = g.crits.filter(function(c){return c.p;}).length;
    return { name: g.short || g.name, pct: Math.round(passed / g.crits.length * 100) };
  }).sort(function(a,b){ return b.pct - a.pct; });
  el.innerHTML = scored.map(function(s){
    return '<div class="prf-compat-row">'+
      '<span class="prf-compat-lbl">'+s.name+'</span>'+
      '<div class="prf-compat-track"><div class="prf-compat-fill" style="width:'+s.pct+'%"></div></div>'+
      '<span class="prf-compat-val">'+s.pct+'%</span></div>';
  }).join('');
}

function _buildSadeMetrics() {
  var el = document.getElementById('prf-sade-metrics');
  if (!el) return;
  var d = _prfData;
  if (!d) { el.innerHTML = '<div style="padding:20px;color:var(--muted);font-size:12px;">Veri yok.</div>'; return; }
  function fmtPct(v){ return v!=null&&!isNaN(v) ? (v*100).toFixed(1)+'%' : '—'; }
  var rsi = d.RSI!=null ? d.RSI : (d.rsi!=null ? d.rsi : null);
  var metrics = [
    {l:'Piyasa Değeri', v: (typeof _mcapDual==='function' && d.market_cap_basic) ? _mcapDual(d.market_cap_basic) : '—', cls:''},
    {l:'F/K', v: d.pe_ratio!=null&&d.pe_ratio>0 ? d.pe_ratio.toFixed(1)+'x' : '—', cls: d.pe_ratio>0&&d.pe_ratio<15?'g':(d.pe_ratio>25?'b':'')},
    {l:'PD/DD', v: d.price_book_ratio!=null&&d.price_book_ratio>0 ? d.price_book_ratio.toFixed(2)+'x' : '—', cls: d.price_book_ratio>0&&d.price_book_ratio<2?'g':''},
    {l:'ROE', v: fmtPct(d.roe), cls: (d.roe*100)>15?'g':((d.roe*100)<8?'b':'')},
    {l:'RSI (14)', v: rsi!=null&&!isNaN(rsi) ? (+rsi).toFixed(1) : '—', cls: rsi!=null&&rsi<30?'g':(rsi>70?'b':'')},
    {l:'Temettü Verimi', v: fmtPct(d.dividend_yield_recent), cls: (d.dividend_yield_recent*100)>3?'g':''},
  ];
  el.innerHTML = metrics.map(function(m){
    return '<div class="prf-sade-mcell"><div class="prf-sade-mlabel">'+m.l+'</div>'+
      '<div class="prf-sade-mval '+(m.cls||'')+'">'+m.v+'</div></div>';
  }).join('');
}

function _buildBadges() {
  var el = document.getElementById('prf-badges');
  if (!el) return;
  var d = _prfData;
  if (!d) { el.innerHTML=''; return; }
  var badges = [];
  // En uyumlu strateji
  var scored = _prfGuruDefs(d).map(function(g){
    var passed = g.crits.filter(function(c){return c.p;}).length;
    return { name: g.short || g.name, pct: Math.round(passed / g.crits.length * 100) };
  }).sort(function(a,b){ return b.pct - a.pct; });
  if (scored.length) badges.push({ t: scored[0].name+' %'+scored[0].pct, good: scored[0].pct>=60 });
  // 200G MA
  var sma200 = d.SMA200!=null?d.SMA200:(d['SMA200']!=null?d['SMA200']:null);
  var price = d.close||d.price;
  if (sma200!=null && price) badges.push({ t: price>=sma200 ? '200G MA üstü' : '200G MA altı', good: price>=sma200 });
  // RSI durumu
  var rsi = d.RSI!=null?d.RSI:(d.rsi!=null?d.rsi:null);
  if (rsi!=null && !isNaN(rsi)) badges.push({ t: rsi<30?'RSI aşırı satım':rsi>70?'RSI aşırı alım':'RSI nötr', good: rsi<30 });
  el.innerHTML = badges.map(function(b){ return '<span class="prf-badge'+(b.good?' g':'')+'">'+b.t+'</span>'; }).join('');
}

function _buildSadeView() {
  _buildSadeMetrics();
  renderStrategyCompat();
  _buildBadges();
  _buildTechMetrics();
}

// ── Mockup sekme geçişi ──
function anTab(id, el) {
  var tabs = document.querySelectorAll('.an-tabs .atab');
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('on');
  if (el) el.classList.add('on');
  ['ov','de','go','fv','ne'].forEach(function(x){
    var p = document.getElementById('anp-'+x);
    if (p) p.classList.toggle('on', x === id);
  });
  if (id === 'fv' && typeof _startFairValue === 'function') _startFairValue();
  if (id === 'de' && typeof _buildTechMetrics === 'function') _buildTechMetrics();
  var sc = document.querySelector('.an-scroll'); if (sc) sc.scrollTop = 0;
}

function prfChartRange(el) {
  var pills = el.parentElement.querySelectorAll('.an-pill');
  for (var i = 0; i < pills.length; i++) pills[i].classList.remove('on');
  el.classList.add('on');
}

// ── Teknik göstergeler grid (mevcut verilerden) ──
function _buildTechMetrics() {
  var el = document.getElementById('prf-tech-metrics');
  if (!el) return;
  var d = _prfData;
  if (!d) { el.innerHTML = '<div style="padding:20px;color:var(--muted);font-size:12px;">Veri yok.</div>'; return; }
  var exMeta = (typeof EXCHANGE_META !== 'undefined' && EXCHANGE_META[_prfEx]) || {currency:'₺'};
  var cur = exMeta.currency || '₺';
  var rsi = d.RSI!=null?d.RSI:(d.rsi!=null?d.rsi:null);
  var sma50 = d.SMA50!=null?d.SMA50:null, sma200 = d.SMA200!=null?d.SMA200:null;
  var hi=d['52_week_high'], lo=d['52_week_low'];
  function f(v){ return v!=null&&!isNaN(v)?(+v).toFixed(2):'—'; }
  var metrics = [
    {l:'RSI (14)', v: rsi!=null&&!isNaN(rsi)?(+rsi).toFixed(1):'—', cls: rsi!=null&&rsi<30?'g':(rsi>70?'b':'')},
    {l:'50G Ort.', v: sma50!=null?cur+' '+f(sma50):'—', cls:''},
    {l:'200G Ort.', v: sma200!=null?cur+' '+f(sma200):'—', cls:''},
    {l:'52H Aralık', v: (hi&&lo)?f(lo)+' – '+f(hi):'—', cls:''},
    {l:'Beta', v: d.beta!=null?f(d.beta):'—', cls:''},
    {l:'Haftalık Perf.', v: d.Perf_W!=null?((d.Perf_W>=0?'+':'')+d.Perf_W.toFixed(2)+'%'):'—', cls: d.Perf_W>=0?'g':'b'},
  ];
  el.innerHTML = metrics.map(function(m){
    return '<div class="prf-sade-mcell"><div class="prf-sade-mlabel">'+m.l+'</div>'+
      '<div class="prf-sade-mval '+(m.cls||'')+'">'+m.v+'</div></div>';
  }).join('');
  // teknik rozetler
  var bel = document.getElementById('prf-tech-badges');
  if (bel) {
    var bs = [];
    var price = d.close||d.price;
    if (sma200!=null && price) bs.push({t: price>=sma200?'200G MA üstü':'200G MA altı', good: price>=sma200});
    if (sma50!=null && price) bs.push({t: price>=sma50?'50G MA üstü':'50G MA altı', good: price>=sma50});
    if (rsi!=null && !isNaN(rsi)) bs.push({t: rsi<30?'RSI aşırı satım':rsi>70?'RSI aşırı alım':'RSI nötr', good: rsi<30});
    bel.innerHTML = bs.map(function(b){ return '<span class="prf-badge'+(b.good?' g':'')+'">'+b.t+'</span>'; }).join('');
  }
}

// RSI (Wilder, 14) — mum kapanışlarından
function _calcRSI(data, period) {
  if (!data || data.length < period + 1) return null;
  var avgG = 0, avgL = 0, i, ch;
  for (i = 1; i <= period; i++) { ch = data[i].close - data[i-1].close; if (ch >= 0) avgG += ch; else avgL -= ch; }
  avgG /= period; avgL /= period;
  for (i = period + 1; i < data.length; i++) {
    ch = data[i].close - data[i-1].close;
    var g = ch >= 0 ? ch : 0, l = ch < 0 ? -ch : 0;
    avgG = (avgG * (period - 1) + g) / period;
    avgL = (avgL * (period - 1) + l) / period;
  }
  if (avgL === 0) return 100;
  var rs = avgG / avgL;
  return 100 - (100 / (1 + rs));
}

// Grafik mum verisinden RSI / SMA50 / SMA200 / 52H hesapla ve metrikleri tazele
function _fillTechFromCandles() {
  if (!_prfData || !_chartData || !_chartData.length) return;
  var c = _chartData;
  var rsi = _calcRSI(c, 14);
  if (rsi != null && (_prfData.RSI == null)) _prfData.RSI = rsi;
  if (_prfData.SMA50 == null) { var s50 = _calcSMA(c, 50); if (s50.length) _prfData.SMA50 = s50[s50.length-1].value; }
  if (_prfData.SMA200 == null) { var s200 = _calcSMA(c, 200); if (s200.length) _prfData.SMA200 = s200[s200.length-1].value; }
  if (!_prfData['52_week_high'] || !_prfData['52_week_low']) {
    var hi = -Infinity, lo = Infinity, start = Math.max(0, c.length - 252);
    for (var i = start; i < c.length; i++) { if (c[i].high > hi) hi = c[i].high; if (c[i].low < lo) lo = c[i].low; }
    if (hi > -Infinity && !_prfData['52_week_high']) _prfData['52_week_high'] = hi;
    if (lo < Infinity && !_prfData['52_week_low']) _prfData['52_week_low'] = lo;
  }
  try { _buildSadeMetrics(); } catch(e) {}
  try { _buildBadges(); } catch(e) {}
  try { _buildTechMetrics(); } catch(e) {}
  try { if (typeof _buildPrfSide === 'function') _buildPrfSide(); } catch(e) {}
}

function prfSetMode(mode) {
  var pg = document.getElementById('profile-page');
  if (!pg) return;
  var detay = mode === 'detay';
  pg.classList.toggle('mode-detay', detay);
  pg.classList.toggle('mode-sade', !detay);
  var bD = document.getElementById('prf-to-detay'), bS = document.getElementById('prf-to-sade');
  if (bD) bD.style.display = detay ? 'none' : '';
  if (bS) bS.style.display = detay ? '' : 'none';
  var sc = document.querySelector('.prf-main'); if (sc) sc.scrollTop = 0;
}

function _buildPrfSide() {
  var d = _prfData || {};
  var exMeta = EXCHANGE_META[_prfEx] || EXCHANGE_META.bist;
  var cur = exMeta.currency || '₺';
  var stats = [
    {k:'52H Yüksek',    v: d['52_week_high'] ? cur+' '+d['52_week_high'].toFixed(2) : '—'},
    {k:'52H Düşük',     v: d['52_week_low']  ? cur+' '+d['52_week_low'].toFixed(2)  : '—'},
    {k:'Beta',          v: d.beta ? d.beta.toFixed(2) : '—'},
    {k:'Piyasa Değeri', v: _mcapDual(d.market_cap_basic)},
    {k:'Ort. Hacim',    v: d.average_volume_10d_calc ? _fmtN(d.average_volume_10d_calc) : '—'},
    {k:'Temettü',       v: d.dividend_yield_recent ? (d.dividend_yield_recent*100).toFixed(2)+'%' : '—', cls:'g'},
    {k:'Haftalık',      v: d.Perf_W ? (d.Perf_W>=0?'+':'')+d.Perf_W.toFixed(2)+'%' : '—', cls:d.Perf_W>=0?'g':'r'},
    {k:'Aylık',         v: d.Perf_1M ? (d.Perf_1M>=0?'+':'')+d.Perf_1M.toFixed(2)+'%' : '—', cls:d.Perf_1M>=0?'g':'r'},
  ];
  document.getElementById('prf-price-stats').innerHTML = stats.map(function(s){
    return '<div class="prf-qstat"><span class="prf-qkey">'+s.k+'</span><span class="prf-qval '+(s.cls||'')+'">'+s.v+'</span></div>';
  }).join('');

  // Benzer hisseler
  var similar = allData.filter(function(x){ return d.sector && x.sector===d.sector && x.symbol!==d.symbol; }).slice(0,5);
  document.getElementById('prf-similar').innerHTML = similar.length ? similar.map(function(s){
    var sym2=s.symbol.replace('.IS',''), chg=s.change_abs||0;
    return '<div class="prf-sim-item" onclick="showProfil(\''+sym2+'\',\''+_prfEx+'\')">'+
      '<span class="prf-sim-sym">'+sym2+'</span>'+
      '<span class="prf-sim-name">'+((s.name||'').substring(0,22))+'</span>'+
      '<span class="prf-sim-chg" style="color:'+(chg>=0?'var(--green)':'var(--red)')+'">'+
      (chg>=0?'+':'')+chg.toFixed(2)+'%</span></div>';
  }).join('') : '<div style="font-size:11px;color:var(--muted)">Önce tarama yapın</div>';
}

function prfTab(id, el) {
  document.querySelectorAll('.prf-tab').forEach(function(t){t.classList.remove('on');});
  document.querySelectorAll('.prf-panel').forEach(function(p){p.classList.remove('on');});
  if(el) el.classList.add('on');
  var panel = document.getElementById('prf-panel-'+id);
  if(panel) panel.classList.add('on');
  if(id==='fairvalue') _startFairValue();
}

// ── Adil Fiyat Analizi ──────────────────────────────────────────────────
function _startFairValue() {
  var d    = _prfData;
  var el   = document.getElementById('fv-content');
  if(!el) return;

  if(!d) {
    el.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted2);font-size:12px;">Hisse verisi bulunamadı. Lütfen önce tarama yapın.</div>';
    return;
  }

  var exMeta = (typeof EXCHANGE_META!=='undefined' && EXCHANGE_META[_prfEx]) || {};
  var cur    = exMeta.currency || '₺';
  var price  = d.close || d.price || 0;

  // Screener verisi zaten yüklü — anında render et, ağ çağrısı yok
  _renderFV(el, price, cur, d, {});
}

function _renderFV(el, price, cur, d, v) {
  var SEKTOR_FK   = 12;
  var SEKTOR_PDDD = 1.2;

  // Screener verisinden direkt çek (v boş geçilir artık)
  var pe  = (d.pe_ratio        && d.pe_ratio        > 0) ? d.pe_ratio        : null;
  var pb  = (d.price_book_ratio && d.price_book_ratio > 0) ? d.price_book_ratio : null;
  var roe = d.roe         ? +(d.roe         * 100).toFixed(1) : null;
  var nm  = d.net_margin  ? +(d.net_margin  * 100).toFixed(1) : null;
  var eg  = d.eps_growth_ttm_yoy != null ? +d.eps_growth_ttm_yoy : (d.earnings_per_share_change_ttm_yoy != null ? +d.earnings_per_share_change_ttm_yoy : null);
  var rg  = d.revenue_growth_ttm_yoy != null ? +d.revenue_growth_ttm_yoy : (d.total_revenue_change_ttm_yoy != null ? +d.total_revenue_change_ttm_yoy : null);
  var fs  = d.piotroski_f_score != null ? d.piotroski_f_score : null;

  var f2 = function(v){ return cur+' '+v.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}); };
  var f4 = function(v){ return cur+' '+v.toFixed(4); };
  var p2 = function(v){ return (v>=0?'+':'')+v.toFixed(1)+'%'; };

  if(!price || price<=0) { el.innerHTML='<div style="padding:24px;text-align:center;color:var(--muted2);font-size:12px;">Fiyat verisi bulunamadı.</div>'; return; }

  // Türetilen değerler
  var eps    = (pe  && pe  > 0) ? price / pe  : null;
  var defter = (pb  && pb  > 0) ? price / pb  : null;
  var fkT    = eps    ? +(eps    * SEKTOR_FK  ).toFixed(4) : null;
  var pdddT  = defter ? +(defter * SEKTOR_PDDD).toFixed(4) : null;
  var graham = (eps && eps > 0 && defter && defter > 0) ? +Math.sqrt(22.5 * eps * defter).toFixed(4) : null;

  var methods = [fkT, pdddT].filter(function(x){ return x && x > 0; });
  if(!methods.length) {
    el.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted2);font-size:12px;">F/K ve PD/DD verisi bulunamadı — bu hisse için hesaplama yapılamıyor.<br><span style="font-size:10px;margin-top:6px;display:block;">İpucu: Zarar eden şirketlerde F/K hesaplanamaz.</span></div>';
    return;
  }

  var adil    = methods.reduce(function(a,b){return a+b;},0) / methods.length;
  var guvenli = adil * 0.70;
  var hedef1  = adil * 1.30;
  var hedef2  = adil * 1.50;

  // Karar
  var karar, kc, kb;
  if     (price < guvenli)   { karar='GÜÇLÜ AL'; kc='#22c55e'; kb='rgba(34,197,94,.13)'; }
  else if(price < adil)      { karar='AL';        kc='#eab308'; kb='rgba(234,179,8,.13)';  }
  else if(price < adil*1.10) { karar='TUT';       kc='#94a3b8'; kb='rgba(148,163,184,.1)'; }
  else                        { karar='PAHALI';    kc='#ef4444'; kb='rgba(239,68,68,.13)';  }

  var upside = (adil - price) / price * 100;

  // Zone bar: 0 → 2× adil
  var barMax  = adil * 2;
  var mkPos   = +(Math.min(Math.max(price   / barMax * 100, 1), 99)).toFixed(1);
  var gvPos   = +(guvenli / barMax * 100).toFixed(1);
  var adilPos = +(adil    / barMax * 100).toFixed(1);
  var ovPos   = +((adil*1.10) / barMax * 100).toFixed(1);

  var html = [];

  // ① Veri özeti
  html.push('<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">');
  var cards = [
    {l:'Mevcut Fiyat', v:f2(price),              c:''},
    {l:'F/K Oranı',    v:pe ? pe.toFixed(1)+'x':'—',  c:pe&&pe<15?'g':pe&&pe<25?'m':'b'},
    {l:'PD/DD',        v:pb ? pb.toFixed(2)+'x':'—',  c:pb&&pb<2?'g':pb&&pb<4?'m':'b'},
    {l:'EPS/Hisse',    v:eps    ? f4(eps)    :'—',     c:''},
    {l:'Defter/Hisse', v:defter ? f4(defter) :'—',     c:''},
    {l:'Graham Sayısı',v:graham ? f2(graham) :'—',     c:''},
  ];
  var cmap = {g:'#22c55e',m:'#f59e0b',b:'#ef4444'};
  cards.forEach(function(c){
    var vc = c.c ? cmap[c.c]||'var(--text)' : 'var(--text)';
    html.push('<div style="background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;">');
    html.push('<div style="font-size:9px;color:var(--text2);text-transform:uppercase;letter-spacing:.4px;margin-bottom:5px;">'+c.l+'</div>');
    html.push('<div style="font-size:12px;font-weight:700;font-family:\'Inter\',sans-serif;color:'+vc+';">'+c.v+'</div>');
    html.push('</div>');
  });
  html.push('</div>');

  // ② Karar banner
  html.push('<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-radius:10px;border:1px solid '+kc+'44;background:'+kb+';margin-bottom:14px;">');
  html.push('<div><div style="font-size:17px;font-weight:800;color:'+kc+';">'+karar+'</div>');
  html.push('<div style="font-size:10px;color:var(--muted2);margin-top:3px;">'+_prfSym+' · '+f2(price)+'</div></div>');
  html.push('<div style="text-align:right;"><div style="font-size:14px;font-weight:700;color:'+(upside>=0?'#22c55e':'#ef4444')+';">'+p2(upside)+'</div>');
  html.push('<div style="font-size:10px;color:var(--muted2);">adil fiyata göre</div></div></div>');

  // ③ Zone bar
  html.push('<div style="margin-bottom:18px;">');
  html.push('<div style="font-size:10px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Fiyat Bölgesi</div>');
  html.push('<div style="position:relative;height:14px;border-radius:7px;margin-bottom:10px;background:linear-gradient(to right,#22c55e 0,#22c55e '+gvPos+'%,#eab308 '+gvPos+'%,#eab308 '+adilPos+'%,#94a3b8 '+adilPos+'%,#94a3b8 '+ovPos+'%,#ef4444 '+ovPos+'%,#ef4444 100%);">');
  html.push('<div style="position:absolute;top:-4px;left:'+mkPos+'%;transform:translateX(-50%);width:22px;height:22px;border-radius:50%;background:#fff;border:3px solid #0b0e13;box-shadow:0 0 0 2px '+kc+';" title="'+f2(price)+'"></div>');
  html.push('</div>');
  html.push('<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;font-size:9px;color:var(--muted2);">');
  html.push('<span>Güçlü Al &lt; '+f2(guvenli)+'</span>');
  html.push('<span style="text-align:center;">Al &lt; '+f2(adil)+'</span>');
  html.push('<span style="text-align:right;">Pahalı &gt; '+f2(adil*1.10)+'</span>');
  html.push('</div></div>');

  // ④ Hedef fiyatlar
  html.push('<div style="margin-bottom:14px;">');
  html.push('<div style="font-size:10px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Hedef Fiyatlar</div>');
  html.push('<div style="display:flex;flex-direction:column;gap:6px;">');
  var targets = [
    {icon:'', label:'Güvenli Alım',  price:guvenli, desc:'Adil fiyatın %70\'i — maksimum güvenlik marjı'},
    {icon:'', label:'Adil Fiyat',    price:adil,    desc:methods.length===2 ? 'F/K + PD/DD hedefinin ortalaması' : (fkT ? 'F/K bazlı değerleme' : 'PD/DD bazlı değerleme')},
    graham ? {icon:'', label:'Graham Sayısı', price:graham, desc:'√(22,5 × EPS × Defter) — Benjamin Graham formülü'} : null,
    {icon:'', label:'Hedef 1',       price:hedef1,  desc:'Adil fiyatın %130\'u — kısa vadeli hedef'},
    {icon:'', label:'Hedef 2',       price:hedef2,  desc:'Adil fiyatın %150\'si — uzun vadeli hedef'},
  ];
  targets.forEach(function(t){
    if(!t) return;
    var chg = (t.price - price) / price * 100;
    var cc  = chg >= 0 ? '#22c55e' : '#ef4444';
    html.push('<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:var(--s2);border:1px solid var(--border);border-radius:8px;">');
    html.push('<div><div style="font-size:11px;font-weight:600;color:var(--text);">'+t.icon+' '+t.label+'</div>');
    html.push('<div style="font-size:10px;color:var(--muted2);margin-top:2px;">'+t.desc+'</div></div>');
    html.push('<div style="text-align:right;"><div style="font-size:13px;font-weight:700;font-family:\'Inter\',sans-serif;color:var(--text);">'+f2(t.price)+'</div>');
    html.push('<div style="font-size:10px;font-weight:600;color:'+cc+';">'+p2(chg)+'</div></div></div>');
  });
  html.push('</div></div>');

  // ⑤ Adım adım hesaplama
  html.push('<div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:14px;">');
  html.push('<div style="font-size:11px;font-weight:600;color:var(--text);margin-bottom:12px;">Adım Adım Hesaplama</div>');
  html.push('<div style="display:flex;flex-direction:column;gap:4px;">');
  var steps = [
    {n:'1', t:'EPS (Hisse Başı Kazanç)',  f: eps    ? f2(price)+' ÷ '+pe.toFixed(1)+'x = '+f4(eps)           : '— (F/K verisi yok)',        ok:!!eps},
    {n:'2', t:'Defter Değeri / Hisse',     f: defter ? f2(price)+' ÷ '+pb.toFixed(2)+'x = '+f4(defter)        : '— (PD/DD verisi yok)',       ok:!!defter},
    {n:'3', t:'F/K Hedef Fiyatı',          f: fkT    ? f4(eps)+' × '+SEKTOR_FK+' = '+f2(fkT)                  : '— (hesaplanamadı)',          ok:!!fkT},
    {n:'4', t:'PD/DD Hedef Fiyatı',        f: pdddT  ? f4(defter)+' × '+SEKTOR_PDDD+' = '+f2(pdddT)           : '— (hesaplanamadı)',          ok:!!pdddT},
    graham ? {n:'5', t:'Graham Sayısı', f:'√(22,5 × '+f4(eps)+' × '+f4(defter)+') = '+f2(graham), ok:true} : null,
    {n:'6', t:'Adil Fiyat',               f: '('+methods.map(f2).join(' + ')+') ÷ '+methods.length+' = '+f2(adil),                           ok:true},
    {n:'7', t:'Güvenli Alım Bölgesi',      f: f2(adil)+' × 0,70 = '+f2(guvenli),                                                              ok:true},
    {n:'8', t:'Hedef Fiyat 1',             f: f2(adil)+' × 1,30 = '+f2(hedef1),                                                               ok:true},
    {n:'9', t:'Hedef Fiyat 2',             f: f2(adil)+' × 1,50 = '+f2(hedef2),                                                               ok:true},
  ];
  steps.forEach(function(s){
    if(!s) return;
    html.push('<div style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04);">');
    html.push('<div style="min-width:20px;height:20px;border-radius:50%;background:'+(s.ok?'var(--accent)':'rgba(100,116,139,.3)')+';color:#fff;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;">'+s.n+'</div>');
    html.push('<div><div style="font-size:11px;font-weight:600;color:var(--text);">'+s.t+'</div>');
    html.push('<div style="font-size:10px;color:var(--muted2);margin-top:2px;font-family:\'Inter\',sans-serif;">'+s.f+'</div></div></div>');
  });
  html.push('</div></div>');

  // ⑥ Ek göstergeler (varsa)
  var extras = [
    roe  != null ? {l:'ROE',          v:(roe>=0?'+':'')+roe+'%',  c:roe>15?'g':roe>8?'m':'b'} : null,
    nm   != null ? {l:'Net Marj',     v:(nm >=0?'+':'')+nm +'%',  c:nm>10?'g':nm>5?'m':'b'}  : null,
    eg   != null ? {l:'EPS Büyüme',   v:(eg >=0?'+':'')+eg +'%',  c:eg>10?'g':eg>0?'m':'b'}  : null,
    rg   != null ? {l:'Gelir Büyüme', v:(rg >=0?'+':'')+rg +'%',  c:rg>10?'g':rg>0?'m':'b'}  : null,
    fs   != null ? {l:'Piotroski',    v:fs+'/9',                   c:fs>=7?'g':fs>=4?'m':'b'} : null,
  ].filter(Boolean);

  if(extras.length) {
    html.push('<div style="margin-bottom:14px;">');
    html.push('<div style="font-size:10px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Ek Göstergeler</div>');
    html.push('<div style="display:grid;grid-template-columns:repeat('+Math.min(extras.length,3)+',1fr);gap:8px;">');
    extras.forEach(function(e){
      var ec = cmap[e.c]||'var(--text)';
      html.push('<div style="background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:10px;">');
      html.push('<div style="font-size:9px;color:var(--text2);margin-bottom:4px;">'+e.l+'</div>');
      html.push('<div style="font-size:13px;font-weight:700;color:'+ec+';">'+e.v+'</div></div>');
    });
    html.push('</div></div>');
  }

  // ⑦ Uyarı
  html.push('<div style="font-size:10px;color:var(--muted2);padding:10px 12px;background:rgba(240,180,41,.05);border:1px solid rgba(240,180,41,.2);border-radius:6px;line-height:1.6;">');
  html.push('<b>Metodoloji:</b> EPS = Fiyat÷F/K · Defter = Fiyat÷PD/DD · Adil = Ort(F/K Hedef, PD/DD Hedef) · Graham = √(22,5×EPS×Defter) · Güvenli Alım = Adil×0,70.<br>');
  html.push('Bu analiz nicel çarpan modelidir; makroekonomi, sektör dinamikleri ve şirkete özgü riskleri yansıtmaz. Yatırım tavsiyesi değildir.');
  html.push('</div>');

  el.innerHTML = html.join('');
}


// ── Twelve Data: fiyat + şirket bilgisi ──
async function loadFinData(sym, ex) {
  try {
    var exParam = '&ex='+encodeURIComponent(ex);
    var [qRes, nRes] = await Promise.all([
      fetch('/api/quote?sym='+encodeURIComponent(sym)+exParam),
      fetch('/api/quote?sym='+encodeURIComponent(sym)+exParam+'&type=news'),
    ]);
    var q = qRes.ok ? await qRes.json() : {};
    var n = nRes.ok ? await nRes.json() : {};
    if(q.error || !q.price) return;

    var cur = (EXCHANGE_META[ex]||{}).currency || '$';

    // TV verisini _prfData'ya merge et — screener verisi yoksa TV'den doldur
    if(!_prfData) _prfData = {};
    var d = _prfData;
    // Fiyat — en kritik alan, screener yoksa TV'den doldur
    if(!d.close && q.price) { d.close = q.price; d.currentPrice = q.price; d.price = q.price; }
    // Metrics — screener yoksa TV'den al
    if(!d.pe_ratio         && q.pe)          d.pe_ratio            = q.pe;
    if(!d.price_book_ratio && q.pb)          d.price_book_ratio    = q.pb;
    // TV ROE/ROA/margin % olarak geliyor (50.5), _prfData oran bekliyor (0.505)
    if(!d.roe            && q.roe)           d.roe                 = q.roe / 100;
    if(!d.roa            && q.roa)           d.roa                 = q.roa / 100;
    if(!d.net_margin     && q.netMargin)     d.net_margin          = q.netMargin / 100;
    if(!d.gross_margin   && q.grossMargin)   d.gross_margin        = q.grossMargin / 100;
    if(!d.peg_ratio      && q.peg)           d.peg_ratio           = q.peg;
    if(!d.current_ratio  && q.currentRatio)  d.current_ratio       = q.currentRatio;
    if(!d.debt_to_equity && q.debtToEquity)  d.debt_to_equity      = q.debtToEquity;
    if(!d.piotroski_f_score && q.piotroski) d.piotroski_f_score   = q.piotroski;
    // dividendYield TV'den % olarak geliyor (6.49 = %6.49)
    if(!d.dividend_yield_recent && q.dividendYield) d.dividend_yield_recent = q.dividendYield / 100;
    if(!d['52_week_high'] && q.high52)       d['52_week_high']     = q.high52;
    if(!d['52_week_low']  && q.low52)        d['52_week_low']      = q.low52;
    if(!d.beta            && q.beta)         d.beta                = q.beta;
    if(!d.price_sales     && q.ps)           d.price_sales         = q.ps;
    if(!d.revenue_growth  && q.revenueGrowth) d.revenue_growth     = q.revenueGrowth / 100;
    // Yahoo marketCap yerel para birimi — milyon USD'ye normalize et
    if(!d.market_cap_basic && q.marketCap) {
      var _mcr = _localRate(_prfEx) || 1;
      d.market_cap_basic = (q.marketCap / 1e6) / _mcr;
    }
    if(!d.average_volume_10d_calc && q.avgVolume) d.average_volume_10d_calc = q.avgVolume;
    if(!d.Perf_W  && q.perfW)  d.Perf_W  = q.perfW;
    if(!d.Perf_1M && q.perf1M) d.Perf_1M = q.perf1M;
    if(!d.Perf_Y  && q.perfY)  d.Perf_Y  = q.perfY;
    if(!d.sector  && q.sector)  d.sector  = q.sector;
    if(!d.name    && q.name)    d.name    = q.name;

    // Metrics'i yeniden çiz (TV verisiyle dolu) — deferred to avoid blocking chart
    _buildPrfHero();
    _buildPrfMetrics();
    _buildSadeView();
    requestAnimationFrame(function(){
      _buildPrfPiotroski();
      _buildDeepFinScore();
      _buildTrend(_prfData);
      _renderInvestorFit(_prfData);
      setTimeout(function(){
        _buildPrfGuru();
        _buildPrfSide();
        _buildFinancials(_prfData);
      }, 0);
    });

    // Şirket adı + sektör
    if(q.name)   document.getElementById('prf-fullname').textContent   = q.name;
    if(q.sector) document.getElementById('prf-sector-tag').textContent = q.sector;

    // Sektör ortalamasını yükle
    _sectorAvg = null;
    loadSectorAvg(q.sector || d.sector, ex);

    // Canlı fiyat
    document.getElementById('prf-price').textContent =
      cur+' '+parseFloat(q.price).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
    var chgEl = document.getElementById('prf-chg');
    var cp = parseFloat(q.changePct)||0;
    chgEl.textContent = (cp>=0?'+':'')+cp.toFixed(2)+'%';
    chgEl.className = 'prf-chg '+(cp>=0?'up':'dn');

    // Açıklama
    if(q.description) document.getElementById('prf-desc').textContent = q.description;

    // Yan panel (artık merge edilmiş _prfData kullan)
    var st = [
      {k:'52H Yüksek',    v: d['52_week_high'] ? cur+' '+parseFloat(d['52_week_high']).toLocaleString('tr-TR',{minimumFractionDigits:2}) : '—'},
      {k:'52H Düşük',     v: d['52_week_low']  ? cur+' '+parseFloat(d['52_week_low']).toLocaleString('tr-TR',{minimumFractionDigits:2})  : '—'},
      {k:'Beta',          v: d.beta ? parseFloat(d.beta).toFixed(2) : '—'},
      {k:'Piyasa Değeri', v: _mcapDual(d.market_cap_basic)},
      {k:'Ort. Hacim',    v: d.average_volume_10d_calc ? _fmtN(d.average_volume_10d_calc) : (q.avgVolume?_fmtN(q.avgVolume):'—')},
      {k:'Temettü',       v: d.dividend_yield_recent ? (d.dividend_yield_recent*100).toFixed(2)+'%' : '—', cls:'g'},
      {k:'Sektör',        v: q.sector || d.sector || '—'},
      {k:'Çalışan',       v: q.employees ? Number(q.employees).toLocaleString('tr-TR') : '—'},
    ];
    document.getElementById('prf-price-stats').innerHTML = st.map(function(s){
      return '<div class="prf-qstat"><span class="prf-qkey">'+s.k+'</span><span class="prf-qval '+(s.cls||'')+'">'+s.v+'</span></div>';
    }).join('');

    if(n.news && n.news.length) {
      var _pnews = document.getElementById('prf-news');
      if(_pnews) _pnews.innerHTML = n.news.slice(0,5).map(function(item){
        var date = item.datetime ? new Date(item.datetime).toLocaleDateString('tr-TR') : '';
        return '<div class="prf-news-item">'+
          '<div class="prf-news-src">'+(item.source||'Haber')+'</div>'+
          '<div class="prf-news-title" onclick="window.open(\''+item.url+'\',\'_blank\')">'+item.title+'</div>'+
          '<div class="prf-news-meta"><span>'+date+'</span></div></div>';
      }).join('');
    }
  } catch(e) { console.warn('Quote error:', e); }
}

// ── Başlangıç ──
document.addEventListener('DOMContentLoaded', function() {
  var sym    = _urlParams.get('sym') || '';
  var ex     = _urlParams.get('ex')  || 'bist';
  var dParam = _urlParams.get('d')   || '';

  if(dParam) {
    try {
      var compact = JSON.parse(atob(dParam));
      var d = {
        symbol:sym,
        name:compact.n,
        sector:compact.sc,
        close:compact.cl, price:compact.cl, currentPrice:compact.cl,
        change_abs:compact.ch,
        change:compact.ca, changePercent:compact.ca,
        pe_ratio:compact.pe, peNormalizedAnnual:compact.pe,
        price_book_ratio:compact.pb, pbAnnual:compact.pb,
        price_sales:compact.ps, psTTM:compact.ps,
        roe:(compact.roe||0)/100, roeTTM:(compact.roe||0)/100,
        roa:(compact.roa||0)/100, roaTTM:(compact.roa||0)/100,
        net_margin:(compact.nm||0)/100, netProfitMarginTTM:(compact.nm||0)/100,
        gross_margin:(compact.gm||0)/100, grossMarginTTM:(compact.gm||0)/100,
        revenue_growth_ttm_yoy:compact.rg, revenueGrowthTTMYoy:compact.rg,
        earnings_per_share_change_ttm_yoy:compact.eg, epsGrowthTTMYoy:compact.eg,
        peg_ratio:compact.peg, peg:compact.peg,
        piotroski_f_score:compact.fs, piotroski:compact.fs,
        current_ratio:compact.cr, currentRatioAnnual:compact.cr,
        debt_to_equity:compact.de,
        dividend_yield_recent:(compact.dy||0)/100, dividendYieldIndicatedAnnual:(compact.dy||0)/100,
        Perf_W:compact.pw, Perf_1M:compact.pm, Perf_Y:compact.py,
        beta:compact.bt,
        market_cap_basic:compact.mc, marketCapitalization:compact.mc,
        average_volume_10d_calc:compact.av,
        '52_week_high':compact.wh, '52WeekHigh':compact.wh,
        '52_week_low':compact.wl, '52WeekLow':compact.wl,
        cash_f_operating_activities:compact.cf
      };
      allData = [d];
    } catch(e) { console.warn('Decode error:', e); }
  }

  if(sym) {
    document.title = 'DeepFin — ' + sym;
    showProfil(sym, ex);
    loadFinData(sym, ex);
  }
});


// ── DISCLAIMER ──
var _disclaimerTimer = null;
function _showDisclaimer(onAccept) {
  if (localStorage.getItem('df_disclaimer_v2')) {
    if (onAccept) onAccept();
    return;
  }
  var modal = document.getElementById('disclaimerModal');
  if (!modal) { return; } // DOM henüz yok - DOMContentLoaded bekle
  modal.classList.add('open');
  var btn = document.getElementById('disclaimerBtn');
  var cd  = document.getElementById('disclaimerCountdown');
  var secs = 5;
  btn.disabled = true;
  btn.style.cssText = 'width:100%;padding:13px;border-radius:8px;font-size:13px;font-weight:700;cursor:not-allowed;transition:all .3s;background:var(--s3);border:1px solid var(--border);color:var(--muted);';
  if (_disclaimerTimer) clearInterval(_disclaimerTimer);
  _disclaimerTimer = setInterval(function() {
    secs--;
    if (cd) cd.textContent = '(' + secs + ')';
    if (secs <= 0) {
      clearInterval(_disclaimerTimer);
      btn.disabled = false;
      btn.style.cssText = 'width:100%;padding:13px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;transition:all .3s;background:var(--accent);border:1px solid transparent;color:#fff;';
      if (cd) cd.textContent = '';
    }
  }, 1000);
  btn.onclick = function() {
    localStorage.setItem('df_disclaimer_v2', '1');
    modal.classList.remove('open');
    clearInterval(_disclaimerTimer);
    if (onAccept) onAccept();
  };
}

document.addEventListener('DOMContentLoaded', function() {
  _showDisclaimer(null);
});


// ══════════════════════════════════════════════════════════════════════════
// YENİ PANELLER: Bilanço, Nakit Akışı, Haberler
// ══════════════════════════════════════════════════════════════════════════

var _fundCache = {}; // {type_period: data}

// Sayı formatla (Milyar/Milyon)
function _fmtFin(v, cur) {
  if (v == null || isNaN(v)) return '<span style="color:var(--muted2)">—</span>';
  var abs = Math.abs(v);
  var s = '';
  if (abs >= 1e12)      s = (v/1e12).toFixed(2) + ' T';
  else if (abs >= 1e9)  s = (v/1e9).toFixed(2) + ' B';
  else if (abs >= 1e6)  s = (v/1e6).toFixed(1) + ' M';
  else                  s = v.toLocaleString('tr-TR');
  var cls = v < 0 ? 'color:#f6465d' : 'color:#00c076';
  return '<span style="' + cls + '">' + (cur || '') + ' ' + s + '</span>';
}

// Finansal tablo HTML oluştur
function _buildFinTable(rows, cols) {
  if (!cols || !cols.length) return '<div style="padding:20px;color:var(--muted2);font-size:12px;">Veri bulunamadı</div>';
  var cur = (EXCHANGE_META[_prfEx] || {}).currency || '$';
  var labels = {
    totalRevenue: 'Toplam Gelir', grossProfit: 'Brüt Kar', operatingIncome: 'Faaliyet Karı',
    netIncome: 'Net Kar', ebitda: 'EBITDA', eps: 'HBK',
    totalAssets: 'Toplam Varlık', totalLiab: 'Toplam Yükümlülük',
    totalStockholderEquity: 'Özkaynak', cash: 'Nakit', totalDebt: 'Uzun Vad. Borç', shortLongTermDebt: 'Kısa Vad. Borç',
    operatingCashflow: 'Faaliyet NK', capitalExpenditures: 'Sermaye Harcaması', freeCashflow: 'Serbest NK', dividendsPaid: 'Temettü Ödemesi',
  };
  var html = '<table style="width:100%;border-collapse:collapse;font-size:11px;">';
  html += '<thead><tr><th style="text-align:left;padding:8px 6px;color:var(--text2);border-bottom:1px solid var(--border);font-weight:600;">Kalem</th>';
  cols.forEach(function(c) {
    html += '<th style="text-align:right;padding:8px 6px;color:var(--text2);border-bottom:1px solid var(--border);font-weight:600;">' + (c.date || '') + '</th>';
  });
  html += '</tr></thead><tbody>';
  rows.forEach(function(key) {
    var label = labels[key] || key;
    html += '<tr><td style="padding:7px 6px;color:var(--text2);border-bottom:1px solid rgba(255,255,255,.04);">' + label + '</td>';
    cols.forEach(function(c) {
      html += '<td style="text-align:right;padding:7px 6px;border-bottom:1px solid rgba(255,255,255,.04);">' + _fmtFin(c[key], key === 'eps' ? cur : '') + '</td>';
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

// Dönem seç (annual/quarterly)
function setPeriod(type, period, el) {
  var prefix = type === 'balance' ? 'bal' : type === 'cashflow' ? 'cf' : 'inc';
  ['annual','quarterly'].forEach(function(p) {
    var btn = document.getElementById(prefix + '-' + p);
    if (!btn) return;
    btn.className = (p === period) ? 'prf-period-active' : 'prf-period-btn';
  });
  renderFundPanel(type, period);
}

// Veriyi render et
function renderFundPanel(type, period) {
  // Detaylı tablo veri kaynağı yok — bölüm gizliyse boşuna fetch etme
  var _st = document.getElementById('prf-statements');
  if (_st && _st.style.display === 'none') return;
  var cacheKey = type + '_' + period;
  var data = _fundCache[cacheKey];
  var containerId = type === 'balance' ? 'prf-balance-table' : type === 'cashflow' ? 'prf-cashflow-table' : 'prf-income-table';
  var el = document.getElementById(containerId);
  if (!el) return;

  if (!data) {
    el.innerHTML = '<div style="padding:20px;color:var(--muted2);font-size:12px;">Veri yükleniyor...</div>';
    loadFundData(type, period);
    return;
  }

  var cols = (period === 'quarterly' ? data.quarterly : data.annual) || [];
  if (!cols.length) {
    // Tablo boşsa metrics kartını göster
    var cachedMetrics = _fundCache['_metrics'];
    if (cachedMetrics) {
      el.innerHTML = _buildMetricsCard(cachedMetrics, type);
    } else {
      el.innerHTML = '<div style="padding:20px 0;color:var(--muted2);font-size:12px;">Detaylı tablo verisi bu hisse için mevcut değil.</div>';
    }
    return;
  }

  var rows = type === 'balance'
    ? ['totalAssets','totalLiab','totalStockholderEquity','cash','totalDebt','shortLongTermDebt']
    : type === 'cashflow'
    ? ['operatingCashflow','capitalExpenditures','freeCashflow','dividendsPaid']
    : ['totalRevenue','grossProfit','operatingIncome','netIncome','ebitda'];

  el.innerHTML = _buildFinTable(rows, cols);
}

// API'den veri çek
function loadFundData(type, period) {
  var sym = _prfSym;
  var ex  = _prfEx;
  if (!sym) return;

  var apiType = (type === 'income') ? 'financials' : type;
  fetch('/api/fundamentals?symbol=' + encodeURIComponent(sym) + '&exchange=' + encodeURIComponent(ex) + '&type=' + apiType)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      _fundCache[type + '_annual']    = data;
      _fundCache[type + '_quarterly'] = data;
      renderFundPanel(type, period);
    })
    .catch(function(e) {
      var containerId = type === 'balance' ? 'prf-balance-table' : type === 'cashflow' ? 'prf-cashflow-table' : 'prf-income-table';
      var el = document.getElementById(containerId);
      if (el) el.innerHTML = '<div style="padding:20px;color:var(--muted2);font-size:12px;">Veri alınamadı: ' + e.message + '</div>';
    });
}

// Haberleri yükle ve göster
function loadNewsPanel() {
  var el = document.getElementById('prf-news-list');
  if (!el) return;

  fetch('/api/fundamentals?symbol=' + encodeURIComponent(_prfSym) + '&exchange=' + encodeURIComponent(_prfEx) + '&type=news')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var news = data.news || [];
      if (!news.length) {
        el.innerHTML = '<div style="padding:20px;color:var(--muted2);font-size:12px;">Haber bulunamadı.</div>';
        return;
      }
      el.innerHTML = news.map(function(n) {
        var date = n.datetime ? new Date(n.datetime).toLocaleDateString('tr-TR') : '';
        var img  = n.image ? '<img src="'+n.image+'" onerror="this.style.display=\'none\'" style="width:72px;height:52px;object-fit:cover;border-radius:5px;flex-shrink:0;">' : '';
        return '<div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);align-items:flex-start;">' +
          img +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:11px;color:var(--muted2);margin-bottom:4px;">' + (n.source||'') + ' &bull; ' + date + '</div>' +
            '<div onclick="window.open(\''+n.url+'\',\'_blank\')" style="font-size:12px;font-weight:600;color:var(--text);cursor:pointer;line-height:1.5;margin-bottom:4px;">' + n.title + '</div>' +
            (n.summary ? '<div style="font-size:11px;color:var(--text2);line-height:1.6;">' + n.summary + '</div>' : '') +
          '</div></div>';
      }).join('');
    })
    .catch(function(e) {
      el.innerHTML = '<div style="padding:20px;color:var(--muted2);font-size:12px;">Haberler alınamadı.</div>';
    });
}

// prfTab override — yeni paneller için lazy load
var _origPrfTab = prfTab;
prfTab = function(id, el) {
  _origPrfTab(id, el);
  if (id === 'financials') {
    _buildTrend(_prfData);
    loadFinancialsPanel();
    renderFundPanel('balance', 'annual');
    renderFundPanel('cashflow', 'annual');
  }
  if (id === 'news') loadNewsPanel();
};


// Finansallar paneli — gelir tablosu
function _unusedOldFinPanel() {
  var el = document.getElementById('prf-fin-income');
  if (!el) {
    // Container yoksa oluştur
    var sec = document.querySelector('#prf-panel-financials .prf-section');
    if (!sec) return;
    var div = document.createElement('div');
    div.id = 'prf-fin-income';
    div.style.cssText = 'margin-top:16px;overflow-x:auto;';
    div.innerHTML = '<div style="padding:10px;color:var(--muted2);font-size:12px;">Yükleniyor...</div>';
    sec.appendChild(div);
    el = div;
  }

  if (_fundCache['financials_done']) return;

  fetch('/api/fundamentals?symbol=' + encodeURIComponent(_prfSym) + '&exchange=' + encodeURIComponent(_prfEx) + '&type=financials')
    .then(function(r){ return r.json(); })
    .then(function(data) {
      _fundCache['financials_done'] = true;
      var cols = data.annual || [];
      if (!cols.length) { el.innerHTML = ''; return; }
      var rows = ['totalRevenue','grossProfit','operatingIncome','netIncome','ebitda'];
      var title = '<div style="font-size:11px;font-weight:600;color:var(--text2);margin-bottom:8px;letter-spacing:.5px;text-transform:uppercase;">Gelir Tablosu (Yıllık)</div>';
      el.innerHTML = title + _buildFinTable(rows, cols);
    })
    .catch(function(){ el.innerHTML = ''; });
}

function loadFinancialsPanel() { renderFundPanel('income', 'annual'); }

// ── Özet metrik kartı ─────────────────────────────────────────
function _buildMetricsCard(m, type) {
  if (!m) return '<div style="padding:16px;color:var(--muted2);font-size:12px;">Veri yüklenemedi.</div>';
  var cur = (EXCHANGE_META[_prfEx] || {}).currency || '$';
  var f1  = function(v) { return v != null ? v.toFixed(1) : '—'; };
  var f2  = function(v) { return v != null ? v.toFixed(2) : '—'; };
  var fp  = function(v) { return v != null ? (v >= 0 ? '+' : '') + v.toFixed(1) + '%' : '—'; };
  var clr = function(v, inv) {
    if (v == null) return '#64748b';
    return (inv ? v <= 0 : v >= 0) ? '#00c076' : '#f6465d';
  };

  var rows;
  if (type === 'income') {
    rows = [
      ['Net Kar Marjı', m.netMargin   != null ? m.netMargin.toFixed(1)   + '%' : '—', clr(m.netMargin)],
      ['Brüt Marj',    m.grossMargin != null ? m.grossMargin.toFixed(1) + '%' : '—', clr(m.grossMargin)],
      ['ROE (TTM)',     m.roe         != null ? m.roe.toFixed(1)         + '%' : '—', clr(m.roe)],
      ['ROA (TTM)',     m.roa         != null ? m.roa.toFixed(1)         + '%' : '—', clr(m.roa)],
      ['Gelir Büyüme', fp(m.revenueGrowth), clr(m.revenueGrowth)],
      ['EPS Büyüme',   fp(m.epsGrowth),     clr(m.epsGrowth)],
    ];
  } else if (type === 'balance') {
    rows = [
      ['Cari Oran',       f2(m.currentRatio), m.currentRatio != null && m.currentRatio >= 1 ? '#00c076' : '#f6465d'],
      ['Borç/Özkaynak',   f2(m.debtToEquity), clr(m.debtToEquity, true)],
      ['PD/DD',           f2(m.pb),           '#94a3b8'],
      ['Temettü Verimi',  m.dividendYield != null ? m.dividendYield.toFixed(2) + '%' : '—', '#00c076'],
    ];
  } else {
    rows = [
      ['F/K',             f2(m.pe),   '#94a3b8'],
      ['F/S',             f2(m.ps),   '#94a3b8'],
      ['PEG',             m.peg != null ? f2(m.peg) : '—', '#94a3b8'],
      ['Temettü Verimi',  m.dividendYield != null ? m.dividendYield.toFixed(2) + '%' : '—', '#00c076'],
    ];
  }

  var html = '<div style="background:var(--s2);border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-top:8px;">';
  html += '<div style="padding:8px 14px;background:rgba(30,39,51,.5);font-size:9px;color:var(--muted2);letter-spacing:.5px;text-transform:uppercase;font-weight:600;">';
  html += 'Özet Metrikler</div>';
  rows.forEach(function(row) {
    html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 14px;border-top:1px solid rgba(255,255,255,.04);">';
    html += '<span style="font-size:11px;color:var(--text2);">' + row[0] + '</span>';
    html += '<span style="font-size:12px;font-weight:600;color:' + row[2] + ';">' + row[1] + '</span>';
    html += '</div>';
  });
  html += '</div>';
  return html;
}

// ── DeepFin Skoru Tooltip ────────────────────────────────────────────────
(function() {
  var _tip = null;

  function _tipContent() {
    var w = _dfW();
    function row(emoji, label, weight, desc) {
      return '<div style="background:var(--s2);border-radius:6px;padding:7px 9px;margin-bottom:5px;">'+
        '<div style="display:flex;align-items:center;gap:5px;margin-bottom:2px;">'+
        '<span style="font-size:13px;">'+emoji+'</span>'+
        '<span style="font-size:11px;font-weight:700;color:var(--text);">'+label+'</span>'+
        '<span style="font-size:10px;font-weight:700;color:var(--accent);margin-left:auto;">%'+weight+'</span>'+
        '</div>'+
        '<div style="font-size:9px;color:var(--muted2);line-height:1.5;">'+desc+'</div>'+
        '</div>';
    }
    return '<div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:6px;letter-spacing:.2px;">DeepFin Skoru Nasıl Hesaplanır?</div>'+
      '<div style="font-size:10px;color:var(--muted2);margin-bottom:10px;line-height:1.55;">4 boyutun ağırlıklı ortalaması (0–100). Her boyut kendi metrikleri 0–100\'e normalize edilerek hesaplanır.</div>'+
      row('','Temel', w.temel, 'ROE · Net Marj · Brüt Marj · Gelir Büyümesi · Kazanç Büyümesi · Piotroski F-Skor')+
      row('','Teknik', w.teknik, 'Haftalık · Aylık · Yıllık Fiyat Performansı')+
      row('','Değerleme', w.deger, 'F/K · PD/DD · Fiyat / Satış oranları')+
      row('','Momentum', w.mom, 'Kısa ve uzun vadeli fiyat ivmesi')+
      '<div style="border-top:1px solid var(--border);padding-top:7px;margin-top:2px;font-size:10px;">'+
      '<span style="color:var(--muted2);">Puan: </span>'+
      '<span style="color:#10b981;font-weight:700;">75+ Güçlü</span> · '+
      '<span style="color:#3b82f6;font-weight:700;">60–75 İyi</span> · '+
      '<span style="color:#f0b429;font-weight:700;">45–60 Orta</span> · '+
      '<span style="color:#f43f5e;font-weight:700;">&lt;45 Zayıf</span>'+
      '</div>'+
      '<div style="margin-top:6px;font-size:9px;color:var(--muted);">Ağırlıklar &ldquo;Ağırlık&rdquo; butonundan kişiselleştirilebilir.</div>';
  }

  function _show(rect) {
    if (!_tip) {
      _tip = document.createElement('div');
      _tip.style.cssText = 'position:fixed;z-index:2000;width:272px;background:var(--s1);border:1px solid var(--border2);border-radius:10px;padding:14px 15px;box-shadow:0 8px 28px rgba(15,23,42,.13);pointer-events:none;opacity:0;transition:opacity .15s;';
      document.body.appendChild(_tip);
    }
    _tip.innerHTML = _tipContent();
    var W = 272;
    var tipH = _tip.offsetHeight || 300;
    // Prefer to the left of the ring; if no room, go right; clamp into viewport.
    var left = rect.left - W - 12;
    if (left < 8) {
      left = rect.right + 12;
      if (left + W > window.innerWidth - 8) left = window.innerWidth - W - 8;
    }
    left = Math.max(8, left);
    var top = rect.top + rect.height / 2 - tipH / 2;
    top = Math.max(8, Math.min(top, window.innerHeight - tipH - 8));
    _tip.style.left = left + 'px';
    _tip.style.top  = top  + 'px';
    _tip.style.opacity = '1';
  }

  function _hide() { if (_tip) _tip.style.opacity = '0'; }

  // Event delegation: .df-sc-ring-wrap is rendered dynamically into the
  // Overview panel after load (and may be re-rendered), so binding directly
  // on DOMContentLoaded misses it. Delegate from document instead.
  document.addEventListener('mouseover', function(e) {
    var wrap = e.target.closest && e.target.closest('.df-sc-ring-wrap');
    if (!wrap) return;
    wrap.style.cursor = 'help';
    // Anchor to the ring circle (narrow) rather than the full-width wrap so the
    // tooltip lands beside the gauge instead of off-screen.
    var ring = wrap.querySelector('.df-sc-ring') || wrap;
    _show(ring.getBoundingClientRect());
  });
  document.addEventListener('mouseout', function(e) {
    var wrap = e.target.closest && e.target.closest('.df-sc-ring-wrap');
    if (!wrap) return;
    // Ignore moves that stay within the same wrap.
    if (e.relatedTarget && wrap.contains(e.relatedTarget)) return;
    _hide();
  });
})();
