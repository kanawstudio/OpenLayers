/**
 * Created by Kana on 24/06/2017.
 */
/**
 * Created by Kana on 15/06/2017.
 */
/* ****************************************************************************** */
/* IDECanarias_wms.js                                                             */
/* Libreria JavaScript para acceder a servicios WMS desde la API OPENLAYERS 3     */
/* Documentacion: http://visor.grafcan.es/gmaps/tutorial.html                     */
/*                                                                                */
/* Autor: IDECanarias                                                             */
/* Fecha: 15/01/2016                                                              */
/* Version: 1.00                                                                  */
/* Modificaciones: 																  */
/*   Caja de busqueda sobre el motor de busquedas de IDECanarias				  */
/*   Nuevo servicio Mapa Topografico                                              */
/*   Carga de KML de usuario                                                      */
/*   Peticiones GetFeatureInfo (informacion)                                      */
/*   Agregar servicio WMS externo como overlay                                    */
/* ****************************************************************************** */

// Definicion de variables
// Variables para la carga de KML de usuario
//************************************************************************************************
// Usamos JSONP para realizar las busquedas...
includeStyle('https://visor.grafcan.es/ol3/4.1.1/ol.css');
includeStyle('https://visor.grafcan.es/ol3/grafcan/css/estilos.css');

include('https://visor.grafcan.es/ol3/4.1.1/ol.js');
include('https://visor.grafcan.es/ol3/grafcan/js/json_sans_eval.js');
include('https://visor.grafcan.es/ol3/grafcan/js/proj4.js');
include('https://visor.grafcan.es/jQuery/jquery-2.2.2.min.js');

// Array para los markers de usuario
var markerArray = new Array();

var iconImage = "https://visor.grafcan.es/resources/markers/01.png;"

// Variables para el GetFeatureInfo
var bInformacion=false;
var urlQueryInfo;
var bActivado;
var extent = [-500000,2500000,1500000,4000000];
var centroCanarias = [421559, 3130695];
var overlay;
var container;
var content;
var closer;
var pixelXY;
var vectorKml;
var capa_existe=false;
var sourceSearch, layerSearch;
var serv;
var bCombo;
//
var services = {
	"wms_OU":{
		desc:"Ortofoto Urbana",
		query:{url:"https://idecan1.grafcan.es/ServicioWMS/DistOrtoUrb?",layers:"WMS_DISTORTOURB",queryLayers:"WMS_DISTORTOURB",format:"image/jpeg"},
		layers:[
			{name:"OrtofotoUrb",url:"https://idecan3.grafcan.es/ServicioWMS/OrtoUrb_bat?",layers:"WMS_OrtoExpressUrb",format:"image/jpeg"}
		]
	},
	"wms_OE":{
		desc:"Ortofoto",
		query:{url:"https://idecan3.grafcan.es/ServicioWMS/OrtoExpress_bat?",layers:"WMS_OrtoExpress",queryLayers:"WMS_OrtoExpress",format:"image/jpeg"},
		layers:[
			{name:"Ortofoto",url:"https://idecan3.grafcan.es/ServicioWMS/OrtoExpress_bat?",layers:"WMS_OrtoExpress",format:"image/jpeg"}
		]
	},
	"wms_CA":{
		desc:"Callejero",
		query:{url:"https://idecan2.grafcan.es/ServicioWMS/Callejero?",layers:"CABECERA,VIAS,POI,PIE",queryLayers:"CABECERA,VIAS,POI,PIE",format:"image/png"},
		layers:[
			{name:"Callejero",url:"https://idecan3.grafcan.es/ServicioWMS/Callejero?",layers:"WMS_CA",format:"image/png"}
		]
	},
	"wms_MIX":{
		desc:"Callejero+Ortofoto",
		query:{url:"https://idecan3.grafcan.es/ServicioWMS/CallejeroTxt?",layers:"CABECERA,VIAS,POI,PIE",queryLayers:"CABECERA,VIAS,POI,PIE",format:"image/png"},
		layers:[
			{name:"Ortofoto",url:"https://idecan3.grafcan.es/ServicioWMS/OrtoExpress_bat?",layers:"WMS_OrtoExpress",format:"image/jpeg"},
			{name:"CA_OL",url:"https://idecan3.grafcan.es/ServicioWMS/CallejeroTxt?",layers:"WMS_CA",format:"image/png"}
		]
	},
	"wms_TOPO":{
		desc:"TopogrÃ¡fico",
		query:{url:"https://idecan2.grafcan.es/ServicioWMS/MTI?",layers:"WMS_MTI",queryLayers:"WMS_MTI",format:"image/png"},
		layers:[
			{name:"TopogrÃ¡fico",url:"https://idecan3.grafcan.es/ServicioWMS/MTI?",layers:"WMS_MTI",format:"image/png"},
			{name:"MDT",url:"https://idecan3.grafcan.es/ServicioWMS/MDSombras?",layers:"WMS_HS",format:"image/jpeg",opacity:0.2,maxZoom:19,bgColor:"FFFFFF"}
		]
	}
};
//

// Inicializar Servicios de IDECanarias para la API de OPENLAYERS 3
// Servicios : (un Ãºnico string separado por comas)
//    "wms_OU" Ortofoto Urbana
//    "wms_OE" Ortoexpress
//    "wms_CA"  Callejero
//    "wms_MIX" Ortofoto+Callejero
//    "wms_TOPO" Mapa TopogrÃ¡fico 1:5.000 (junto con Modelo Digital del Terreno)
// [Optional] : Lat,Long,Zoom -> Coordenadas del centro y nivel de zoom
//    Por defecto : todo canarias
// [Optional] : info -> Habilitar pedir informaciÃ³n haciendo click sobre el mapa (GetFeatureInfo)
// Ejemplo : map = IDECanarias_InicializarMapa("wms_OU,wms_CA,wms_MIX",28.11,-17.24,11);

function IDECanarias_InicializarMapa(Servicios,lng,lat,zoom,param_bCombo){
	bCombo=param_bCombo
	var serv= Servicios.split(",");
	if (lat==undefined) lat=3130695;
	if (lng==undefined) lng=421559;
	if (zoom==undefined) zoom=7;

	if (!ol.proj.get('EPSG:32628')) proj4.defs('EPSG:32628',"+proj=utm +zone=28 +ellps=WGS84 +datum=WGS84 +units=m +no_defs");

	//Crear los DIV para la Info
	crearPopup();

	Miview = new ol.View({
		projection: ol.proj.get('EPSG:32628'),
		center: [lng,lat],
		rotation: 0,
		zoom: zoom
	});

	map = new ol.Map({
	  extent: extent,
	  overlays:[overlay],
	  loadTilesWhileAnimating: true,
	  target: 'map_canvas',
	  controls: ol.control.defaults({}, []),
	  logo: false,
	  view: Miview
	});

	//cargar la primera layer de los Servicios predeterminados
	loadWMS(serv[0]);

	//crear los diferentes DIV para ubicar los botones, cajas, etc...
	crearContenedoresDIV();

	//Crear un SELECT OPTIONS
	if (bCombo){
		var handleCustomControl = function (e) {
			reorganizarCapas(mySelect.value)
		}
		var selectList = document.createElement('select');
		selectList.setAttribute("id", "mySelect");
		selectList.addEventListener('change', handleCustomControl, false);

		myControl = new ol.control.Control({
			element: selectList,
			target: "contenedor_botones"
		});
		map.addControl(myControl);
	}

	IDECanarias_crearBotones(Servicios, bCombo)

	eventosMapa();

	//variables para mostrar los markers de las busquedas
	sourceSearch = new ol.source.Vector();
	layerSearch = new ol.layer.Vector({source:sourceSearch});



	return map;
}

function IDECanarias_crearBotones(Servicios, bCombo){
	//Creamos los botones por cada servicio
	var nomServ;
	serv = Servicios.split(",");

	for (var i=0;i<=serv.length-1;i++){
		nomServ=serv[i].trim();
		nomBoton="";

		if (services[nomServ])
			nomBoton = services[nomServ].desc;
		else if (nomServ==svcIDE.name)
			nomBoton=svcIDE.title;

		if (bCombo){
			var option = document.createElement("option");
			option.value = nomServ;
			option.text = nomBoton;
			document.getElementById("mySelect").appendChild(option);

		}else{
			var anchor_element = document.createElement('button');
			anchor_element.href = '#custom_href';
			anchor_element.innerHTML = nomBoton;
			anchor_element.id = nomServ;
			anchor_element.addEventListener('click', function(){reorganizarCapas(this.id)}, false);
			anchor_element.addEventListener('touchstart', function(){reorganizarCapas(this.id)}, false);

			myControl = new ol.control.Control({
				element: anchor_element,
				target: "contenedor_botones"
			});
			map.addControl(myControl);
		}
	}
	if (bCombo) reorganizarCapas(document.getElementById("mySelect").value);
}

// Funcion para aÃ±adir un WMS de usuario (se crearÃ¡ como un overlay sobre la capa base actual).
// Parametros: nombre, url del servicio, capas = layers del servicio, formato (ej: imgage/png), transparencia (1 = opaco)
function IDECanarias_AgregarWMS(nombre,urlwms,capas,formato,transparencia,activar){

	//AÃ±adimos boton para incluir capa externa
	var boton_capa = document.createElement('DIV');
	boton_capa.style.marginRight = "3px";
	boton_capa.style.marginBottom = "1px";

	var boton = document.createElement('BUTTON');
	boton.id = nombre;
	boton.style.height = "22px";
	boton.style.fontFamily = "Arial,sans-serif";
	boton.style.fontSize = "12px";
	boton.style.fontWeight = (activar?"bold":"normal")
	boton.style.borderColor = "#666666";
	boton.style.borderWidth = "1px";
	boton.style.backgroundColor = "#F8F8F8";
	boton.innerHTML = nombre;
	boton.onmouseover = function(){this.style.borderColor = "#4488FF";this.style.borderLeftWidth="2px"};
	boton.onmouseout = function(){this.style.borderColor = "#666666";this.style.borderLeftWidth="1px";};
	boton.onclick = function(){NuevaCapa(nombre,urlwms,capas,formato,transparencia);};
	boton_capa.appendChild(boton);

	myControl = new ol.control.Control({
				element: boton_capa,
				target: "contenedor_usuario"
			});
	map.addControl(myControl);



	if (activar) {
		if (!bActivado){
			bActivado = true;
			NuevaCapa(nombre,urlwms,capas,formato,transparencia);
		}else{
			alert ("WARNING: Activadas por defecto dos o mas botones a la vez");
		}
	}
}
// Habilitar/ Deshabilitar la info sobre el mapa (true/false) : Realiza peticiones GetFeatureInfo
function IDECanarias_Info(info){
	bInformacion = info;
}

// Crea los markers que el usuario halla definido en un Array de entrada
// Array(Lat,Lon,HTML)
function IDECanarias_CrearMarkers(infoMARKER,icono){
	var numMarkers = markerArray.length;
	var iconImage = new ol.style.Style({
		image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
			anchorOrigin: 'center-center',
			anchor: [0.5, 1],
			anchorXUnits: 'fraction',
			anchorYUnits: 'fraction',
			src: icono
		}))
	});

	var source = new ol.source.Vector();
	var layerVector = new ol.layer.Vector({source:source});

	for (var j=numMarkers; j<(numMarkers+infoMARKER.length); j++){
		var marker = new ol.Feature({
			geometry: new ol.geom.Point([infoMARKER[j][0],infoMARKER[j][1]])
		});
		marker.setStyle(iconImage);
		marker.set("html",infoMARKER[j][2]);
		source.addFeature(marker);
	}

	map.addLayer(layerVector);

}

// Funcion para eliminar markers
function IDECanarias_EliminarMarkers(){

	// Eliminarmos todos los Markers...
	for (var i=0; i<markerArray.length; i++){
		markerArray[i].setMap(null);
		}
	markerArray=[];
}

// Funcion para aÃ±adir el logotipo de IDECanarias
function IDECanarias_CrearLogo(){
	var logoDiv = document.createElement('DIV');
	logoDiv.setAttribute("style","display:inline-block");
	logoDiv.id = 'IDECanariasLogo';
	logoDiv.style.cursor = 'pointer';
	// IE6 no soporta PNG24...
	if (document.all && !window.opera && !window.XMLHttpRequest)  // Detectar IE6
		logoDiv.innerHTML = '<a style="text-decoration:none" target="_blank" href="https://visor.grafcan.es"><img border="0" alt="IDECanarias" title="IDECanarias" id="imagelogo" src="https://visor.grafcan.es/ol3/grafcan/images/idecan8.gif"></a>';
	else
		logoDiv.innerHTML = '<a style="text-decoration:none" target="_blank" href="https://visor.grafcan.es"><img border="0" alt="IDECanarias" title="IDECanarias" id="imagelogo" src="https://visor.grafcan.es/ol3/grafcan/images/idecan.png"></a>';

	var myControl = new ol.control.Control({
        element: logoDiv,
		target: "contenedor_logo"
    });
	map.addControl(myControl);

}

function IDECanarias_CrearLogoUsuario(imagen){
	var logotipo = document.createElement('DIV');
	logotipo.setAttribute("style","display:inline-block");
	logotipo.innerHTML = '<img style="margin:auto;height:50px" src="'+imagen+'"/>';
	myControl = new ol.control.Control({
		element: logotipo,
		target: "contenedor_logo"
	});
	map.addControl(myControl)
}

// FunciÃ³n para crear una caja de bÃºsqueda en IDECanarias
function IDECanarias_Busqueda(map,codmun){

	//crear caja de busqueda
    var div=document.createElement("div");
	div.setAttribute("id", "search-content");
	div.setAttribute("style","float:right;margin-left:20px");
	if (codmun)
		div.innerHTML='<form action="javascript:ejecutarSearch(map,\''+codmun+'\');" method="get"><input id="search" placeholder="Buscar" type="text" name="key" value="" style="width:136px;height:18px;font-size:12px;font-family:arial;background-image:url(\'images/search.png\');background-repeat:no-repeat;padding-left:20px;border:outset 1px #a9bbdf"/><input name="submit" id="submit" type="hidden"/></form>';
	else
		div.innerHTML='<form action="javascript:ejecutarSearch(map);" method="get"><input id="search" placeholder="Buscar" type="text" name="key" value="" style="width:136px;height:18px;font-size:12px;font-family:arial;background-image:url(\'images/search.png\');background-repeat:no-repeat;padding-left:20px;border:outset 1px #a9bbdf"/><input name="submit" id="submit" type="hidden"/></form>';


    myControl = new ol.control.Control({
        //className: 'myControl',
        element: div,
		target: "contenedor_botones"
    });
	map.addControl(myControl);


	//crear div para resultado busqueda
	div2=document.createElement("div");
	div2.setAttribute("id", "resulSearch-content");
	div2.setAttribute("style","position:absolute;margin-top:5px;right:0;display:none");
	div2.innerHTML='<div style="float:left" id="ulsearch"></div><div id="search-image" style="float:right"><img onclick="ocultarSearch();" border="0" alt="Cancelar busqueda" height="20" src="https://visor.grafcan.es/ol3/grafcan/images/close.png"></div>';


	document.getElementById("contenedor_botones").appendChild(div2)

}
// Agregar un KML de usuario acotando los niveles de zoom de visualizacion...
function IDECanarias_KML(map,url,minzoom,maxzoom,infowindow){

	vectorKml = new ol.layer.Vector({
		source: new ol.source.Vector({
					format: new ol.format.KML(),
					url: url
				})
	});

	map.addLayer(vectorKml);

}

// Elimina el KML mostrado
function IDECanarias_EliminarKML()
{
	map.removeLayer(vectorKml);
}
//**************************************************************************************************
//**************************************************************************************************FUNCIONES
//**************************************************************************************************
function eventosMapa(){
	map.on("pointerup", function(e) {
		pixelXY = e.pixel;
	});

	//evento para cuando se haga click sobre alguna feature y sacar su info
	map.on('click', function(evt) {

		var feature = map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
		  return feature;
		});

		var coordinate = evt.coordinate;
		if (feature) {

			if (feature.get("html"))
				content.innerHTML = feature.get("html");
			else
				if (feature.get("name")) content.innerHTML = feature.get("name");

			overlay.setPosition(coordinate);
			document.getElementById("popup").style.display = "block";

		}else{
			if (bInformacion == true){
				content.innerHTML = infoclick(pixelXY[0],pixelXY[1]);
				overlay.setPosition(coordinate);
				document.getElementById("popup").style.display = "block";
			}
		}
	});
}

function crearContenedoresDIV(){
	//creamos un DIV para contener a los botones de las capas
	var anchor_element = document.createElement('div');
	anchor_element.setAttribute("style","position:absolute;float:left;top:5px;left:60px;");
	anchor_element.setAttribute("id", "contenedor_botones");

    myControl = new ol.control.Control({
        element: anchor_element,
		target: "map_canvas"
    });
	map.addControl(myControl);

	//creamos un DIV para contener a los botones de las capas de usuario
	var anchor_element = document.createElement('div');
	anchor_element.setAttribute("style","position:absolute;right:0px;top:40px;");
	anchor_element.setAttribute("id", "contenedor_usuario");

    myControl = new ol.control.Control({
        element: anchor_element,
		target: "map_canvas"
    });
	map.addControl(myControl);

	//creamos un DIV para contener logos
	var anchor_element = document.createElement('div');
	anchor_element.setAttribute("style","text-align:center;position:absolute;width:100%;bottom:0px");
	anchor_element.setAttribute("id", "contenedor_logo");

    myControl = new ol.control.Control({
        element: anchor_element,
		target: "map_canvas"
    });
	map.addControl(myControl);
}
function crearPopup(){
	/*
	<div id="popup" class="ol-popup">
      <a href="#" id="popup-closer" class="ol-popup-closer"></a>
      <div id="popup-content"></div>
    </div>
	*/

	var div_p  = document.createElement('div');
	div_p.id  = 'popup';
	div_p.className  = 'ol-popup';

	var a  = document.createElement('a');
	a.href  = '#';
	a.className  = 'ol-popup-closer';
	a.id = 'popup-closer';
	div_p.appendChild(a);

	var div_h  = document.createElement('div');
	div_h.id  = 'popup-content';
	div_p.appendChild(div_h);

	document.getElementsByTagName('body').item(0).appendChild(div_p);

	 /**
       * Elements that make up the popup.
       */
      container = document.getElementById('popup');
      content = document.getElementById('popup-content');
      closer = document.getElementById('popup-closer');


      /**
       * Add a click handler to hide the popup.
       * @return {boolean} Don't follow the href.
       */
      closer.onclick = function() {
        overlay.setPosition(undefined);
        closer.blur();
        return false;
      };


      /**
       * Create an overlay to anchor the popup to the map.
       */
      overlay = new ol.Overlay(/** @type {olx.OverlayOptions} */ ({
        element: container,
        autoPan: true,
        autoPanAnimation: {
          duration: 250
        }
      }));

}

function reorganizarCapas(nombre){
	// removemos todas las capas, excepto las ol.source.Vector
	var index = map.getLayers().getLength()-1;
	while(index>-1) {
		if (!(map.getLayers().item(index).getSource() instanceof ol.source.Vector))
			map.removeLayer(map.getLayers().item(index));
		--index;

	}

	establecerGetFeatureInfo(nombre);

	loadWMS(nombre);

	// movemos las layer Vector a la cima de la pila
	var index = 0, moved = 0;
	while(index<map.getLayers().getLength()-1 && moved<map.getLayers().getLength()-1) {
		if (map.getLayers().item(index).getSource() instanceof ol.source.Vector && map.getLayers().getLength()-1!=index) {
			map.getLayers().insertAt(map.getLayers().getLength()-1,map.getLayers().removeAt(index));
			++moved;
	   } else
			++index;
	}
}

// Funcion de soporte para agregar WMS
function NuevaCapa(nombre,urlwms,capas,tipo,transparencia){

	capa_existe = false;
	map.getLayers().forEach(function(layer) {
		if (nombre == layer.get('name')){
			map.removeLayer(layer);
			capa_existe = true;
		}
	});

	if (!capa_existe){
		map.addLayer(loadWMSParam(nombre,urlwms,capas,tipo,transparencia));
		cargar_urlQueryInfo(urlwms,capas,capas,tipo)
	}

	// movemos las layer Vector a la cima de la pila
	var index = 0, moved = 0;
	while(index<map.getLayers().getLength()-1 && moved<map.getLayers().getLength()-1) {
		if (map.getLayers().item(index).getSource() instanceof ol.source.Vector && map.getLayers().getLength()-1!=index) {
			map.getLayers().insertAt(map.getLayers().getLength()-1,map.getLayers().removeAt(index));
			++moved;
	   } else
			++index;
	}
}

// Peticion de informacion sobre un elemento (GetFeatureInfo)
function infoclick(xt,yt) {
	var extent = map.getView().calculateExtent(map.getSize());

	var w = extent[0];
	var e = extent[2];
	var n = extent[3];
	var s = extent[1];

	var width  = map.getSize()[0];
	var height = map.getSize()[1];

	var url_fi = "";
	var links = "<ul style='padding-left:15px'>";
	var resul = "";
	var entro = false;
	var visualizar = "block";



	if (!services[$('#mySelect').find(":selected").val()] && bCombo){

		for (i= svcIDE.layers.length-1; i>=0; i--){
			var lyr = svcIDE.layers[i]
			if (lyr.visible){
				capasArray = lyr.layers.split(",")
				entro = false;
				for (capa in capasArray){
					if (resul.indexOf(capasArray[capa])==-1){
						url_fi = lyr.url + "&SERVICE=WMS&SRS=EPSG:32628&STYLES=&VERSION=1.1.1&REQUEST=GetFeatureInfo&INFO_FORMAT=text/html&FORMAT="+lyr.format
						url_fi+= "&x="+xt+"&y="+yt+"&BBOX="+w+','+s+','+e+','+n+"&WIDTH="+width+"&HEIGHT="+height
						url_fi+="&QUERY_LAYERS="+capasArray[capa]+"&Layers="+capasArray[capa]

						// El resultado del GetFeatureInfo lo mostraremos en un iframe
						if (tieneDatos(url_fi)){
							resul+='<iframe style="display:'+visualizar+'" id="id_'+lyr.name+'" marginheight="2" marginwidth="2" style="width:95%;height:95%" src="'+url_fi+'""></iframe>';
							entro = true;
						}
					}
				}
				if (entro){
					links += "<li><a href='Javascript:conmutarIframe(\"id_"+lyr.name+"\")'><font face='arial' id='color_id_"+lyr.name+"'"
					if (visualizar=="none")
						links +=" size=2 color='blue'"
					else
						links += " size=2 color='red'"

					links += ">"+lyr.desc+"</font></a></li>"
					visualizar = "none"
				}
			}
		}

		return "<div id='divlinks'>"+links+"</ul><div id='divframes'>"+resul+"</div></div>"

	}else{
		url_fi = urlQueryInfo;

		url_fi= url_fi.replace('paramX',xt);
		url_fi= url_fi.replace('paramY',yt);
		url_fi= url_fi.replace('paramBBOX',w+','+s+','+e+','+n);
		url_fi= url_fi.replace('paramWIDTH',width);
		url_fi= url_fi.replace('paramHEIGHT',height);

		// El resultado del GetFeatureInfo lo mostraremos en un iframe
		return '<iframe id="iframeInfo" marginheight="2" marginwidth="2" style="width:95%;height:95%" src="'+url_fi+'""></iframe>';

	}
}

function conmutarIframe(id_iframe){
	$( "#divlinks" ).find( "font" ).css( "color", "blue" );
	$("#divframes").children().css( "display", "none" );

	$("#color_"+id_iframe).css( "color", "red" );
	$("#"+id_iframe).css( "display", "block" );
}

function tieneDatos(urlinfo){
	var resultado = false;
	jQuery.ajax({
		  url:'genProxy.php?target='+encodeURIComponent(urlinfo),
		  async:false,
		  success:function(data) {
						  if (data) {
							  resultado = true;
						  }
		  }
	});

	return resultado;
}

// Preparamos los servicios para realizar peticiones GetFeatureInfo
function establecerGetFeatureInfo(servicio){
	if (services[servicio]&&services[servicio].query)
		cargar_urlQueryInfo(services[servicio].query.url,services[servicio].query.layers,services[servicio].query.queryLayers,services[servicio].query.format);
	else
		urlQueryInfo="";
}

function cargar_urlQueryInfo(url,layers,queryLayers,format){

	urlQueryInfo = url;
	urlQueryInfo+='&SERVICE=WMS&SRS=EPSG:32628&STYLES=&VERSION=1.1.1&REQUEST=GetFeatureInfo';
	urlQueryInfo+='&X=paramX';
	urlQueryInfo+='&Y=paramY';
	urlQueryInfo+='&QUERY_LAYERS='+queryLayers;
	urlQueryInfo+='&LAYERS='+layers;
	urlQueryInfo+='&INFO_FORMAT=text/html';
	urlQueryInfo+='&FORMAT='+format;
	urlQueryInfo+='&BBOX=paramBBOX';
	urlQueryInfo+='&WIDTH=paramWIDTH&HEIGHT=paramHEIGHT';
}

// Cargamos los servicios WMS predefinidos
function loadWMS(servicio) {
	if (services[servicio]) {
		$(services[servicio].layers).each(function(index,capa) {
			map.addLayer(loadWMSParam(capa.name,capa.url,capa.layers,capa.format,capa.opacity,capa.maxZoom,capa.bgColor));
		});
	} else if (servicio==svcIDE.name) {
		addIDELayers();
	} else
		alert("El servicio [" + servicio + "] no se ha encontrado");
}

// Carga un WMS dados sus parÃ¡metros (url, capas,...)
// Los parÃ¡metros opacity,maxZoom y WMS_BGColor son opcionales
function loadWMSParam(name,url,layers,format,opacity,maxZoom,WMS_BGColor){
	if (opacity==undefined) opacity = 1;

	if (!services[name]) {
		if (!services[name]) {
			services[name] = {};
			services[name].desc = name;
			services[name].layers = [];
			services[name].query = {url:url,layers:layers,queryLayers:layers,format:format};
		}
		services[name].layers.push({name:name,url:url,layers:layers,format:format,opacity:opacity,maxZoom:maxZoom,bgColor:WMS_BGColor});
	}

	return new ol.layer.Tile({
		name:name,
		opacity: opacity,
		extent: extent,
		visible:true,
		source: new ol.source.TileWMS({
			url: url,
			params: {'VERSION':'1.1.1','LAYERS':layers,'FORMAT':format,'TRANSPARENT':true,'CRS':'EPSG:32628'}
		})
	});
}

function ejecutarSearch(map,codmun){

	// Comprobamos si la busqueda esta vacia...
	if (document.getElementById("search").value==""){
		document.getElementById("resulSearch-content").style.display="none";
		document.getElementById("search").placeholder="Buscar en IDECanarias";
		document.getElementById("map_canvas").focus();
		return;
	}

	// Llamada JSONP para evitar problemas de Cross-domain
	var head= document.getElementsByTagName('head')[0];
	var script= document.createElement('script');
	script.type= 'text/javascript';

	if (codmun)
		script.src="https://visor.grafcan.es/ol3/grafcan/searchJSONP.php?callback=ResultadoBusqueda&cantidad=100&codmun="+codmun+"&key="+encodeURIComponent(document.getElementById("search").value);
	else
		script.src="https://visor.grafcan.es/ol3/grafcan/searchJSONP.php?callback=ResultadoBusqueda&cantidad=100&key="+encodeURIComponent(document.getElementById("search").value);

	head.appendChild(script);
}

function ResultadoBusqueda(cadena){
	var divHTML="";
	var xy;
	//var jsonArray = JSON.parse(cadena);         //no existe en exploradores antiguos
	//var jsonArray = eval('(' + cadena + ')');   //no funciona bien cd llegan valores con "
	var jsonArray = jsonParse(cadena);            //funcion incluida con INCLUDE.

	if (jsonArray.length > 0){

		divHTML+="<SELECT  NAME=s1 size=12 ONCHANGE='getSelecteItem(map,this)'";
		divHTML+=" style='font:14px arial,sans-serif;float:inherit;width:320px;float:right;top:23px;padding:2px;font-size:12px;font-weight:bold;color:#777777;border:outset 1px #a9bbdf'";
		divHTML+=" >";

		divHTML += "<OPTION style='color:#FFFFFF;background-color:#708dcf;magin:4px;padding:4px'";
		divHTML += " VALUE = '-9' disabled='disabled'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Resultados bÃºsqueda en IDECanarias</OPTION>"

		divHTML += "<OPTION style='color:#0000AA'";
		divHTML += ' onmouseover='+'"'+"this.style.background='#ccddff'"+'"';   //#a9bbdf
		divHTML += ' onmouseout='+'"'+"this.style.background='#FFFFFF'"+'"';
		divHTML += " VALUE = '-1'>VER TODOS LOS RESULTADOS ( "+jsonArray.length+" )</OPTION>"

		puntosSearch = new Array();

		for(var i=0; i < jsonArray.length; i++) {
			var row = jsonArray[i];

			if (row.descripcion!="")
				desc = row.descripcion;
			else
				desc = "";
			if (row.clasificacion!="")
				clas = row.clasificacion;
			else
				clas = "";
			if (row.localizacion!="")
				local = row.localizacion;
			else
				local = "";
			if (row.codigo!="")
				codigo = row.codigo;
			else
				codigo = "";

			if (row.nombre!="")
				nombre = row.nombre;
			else
				nombre = "";

			xy = ol.proj.transform([parseFloat(row.x), parseFloat(row.y)], 'EPSG:4326', 'EPSG:32628');

			id = row.id;

			divHTML += "<OPTION "
			divHTML += ' onmouseover='+'"'+"this.style.background='#ccddff'"+'"';
			divHTML += ' onmouseout='+'"'+"this.style.background='#FFFFFF'"+'"';
			divHTML += (i%2==0)?" Class='par'":" Class='impar'";
			if (clas != "")
				descTemp = desc.replace(/<b>/g,"");
				descTemp = descTemp.replace(/<\/b>/g,"");
				divHTML +=" title='"+descTemp+'&#013;'+clas+"&#013;("+local+")'";
			divHTML += " VALUE = "+i+">";
			divHTML +=desc;
			if (local != "")	divHTML +=" [" + local +"]";

			divHTML += "</OPTION>";

			dist = "";
			image =""; //lo inicializamos a vacio, pq el rendimiento no es bueno

			puntosSearch.push (new puntos(xy,desc,clas,local,dist,image,nombre,id,codigo));

		}
		divHTML +="</SELECT>";

		document.getElementById("ulsearch").innerHTML=divHTML;

		//div=map.getDiv();
		document.getElementById("resulSearch-content").style.display="table-row";
	}else{
		document.getElementById("resulSearch-content").style.display="none";
		document.getElementById("search").placeholder="Buscar";
		document.getElementById("search").value="";

		alert ("No se han encontrado resultados");
	}
}



function getSelecteItem(map,list){

	if (list.value ==-9) return;

	if (list.value ==-1)
		generarMarkers(map);
	else
		generaMarker(map,list.value);

	ocultarSearch();
}

// Crear marker con el resultado de la busqueda seleccionado
function generaMarker(map,idx){

	borrarTodosMarkers();

	var iconImage = new ol.style.Style({
		image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
			anchorOrigin: 'center-center',
			anchor: [0.5, 1],
			anchorXUnits: 'fraction',
			anchorYUnits: 'fraction',
			src: 'https://visor.grafcan.es/resources/markers/01.png'
		}))
	});

	var marker = new ol.Feature({
		geometry: new ol.geom.Point(puntosSearch[idx].position)
	});
	marker.setStyle(iconImage);
	marker.set("html",ConstruirHtml(puntosSearch[idx].position,
						puntosSearch[idx].desc,
						puntosSearch[idx].clas,
						puntosSearch[idx].local,
						puntosSearch[idx].dist,
						puntosSearch[idx].image,
						puntosSearch[idx].nombre,
						idx,
						true,false,"a_tempMarkers"));

	sourceSearch.addFeature(marker);

	map.removeLayer(layerSearch);
	map.addLayer(layerSearch);

	moverCentro(puntosSearch[idx].position,15)
}

// Crear todos los markers del resultado de la busqueda
function generarMarkers(map){
	if (puntosSearch != '' ){

		borrarTodosMarkers();

		for (puntosindex in puntosSearch){

			if (puntosSearch[puntosindex].image != ""){
				icono = puntosSearch[puntosindex].image;
			}else{
				icono = "https://visor.grafcan.es/resources/markers/01.png";
			}

			var iconImage = new ol.style.Style({
				image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
					anchorOrigin: 'center-center',
					anchor: [0.5, 1],
					anchorXUnits: 'fraction',
					anchorYUnits: 'fraction',
					src: icono
				}))
			});

			var marker = new ol.Feature({
				geometry: new ol.geom.Point(puntosSearch[puntosindex].position)
			});

			marker.setStyle(iconImage);
			marker.set("miID","marker"+puntosindex);
            marker.set("html", ConstruirHtml(puntosSearch[puntosindex].position,
									puntosSearch[puntosindex].desc,
									puntosSearch[puntosindex].clas,
									puntosSearch[puntosindex].local,
									puntosSearch[puntosindex].dist,
									puntosSearch[puntosindex].image,
									puntosSearch[puntosindex].nombre,
									puntosindex,
									true,(puntosSearch.length>1)?true:false,
									"a_tempMarkers")
									);

			sourceSearch.addFeature(marker);


		}

		map.addLayer(layerSearch);

		puntosSearch=[];
		if (sourceSearch.getFeatures().length>0){
			map.getView().fit(sourceSearch.getExtent(), map.getSize());
		}

	}
}

function moverCentro(lnglat,zoom){

	flyTo(lnglat,zoom, function(){});

	/*var view = map.getView();
	view.animate({zoom:zoom,duration:1000});
	view.animate({center:lnglat,duration:2000});

	var pan = ol.animation.pan({ duration: 2000, source: (map.getView().getCenter())});
	//var bounce = ol.animation.bounce({ duration: 2000, resolution: 4 * map.getView().getResolution(), start: +new Date() });
	var ani_zoom = ol.animation.zoom({duration: 2000, resolution: map.getView().getResolution()})

	map.beforeRender(pan, ani_zoom);
	map.getView().setCenter(lnglat);
	map.getView().setZoom(zoom);
*/
}

function flyTo(location,zoom, done ) {
	var view = map.getView();
	var duration = 2000;
//	var zoom = view.getZoom();
	var parts = 2;
	var called = false;
	function callback(complete) {
	  --parts;
	  if (called) {
		return;
	  }
	  if (parts === 0 || !complete) {
		called = true;
		done(complete);
	  }
	}
	view.animate({
	  center: location,
	  duration: duration
	}, callback);
	view.animate({
	  zoom: zoom - 1,
	  duration: duration / 2
	}, {
	  zoom: zoom,
	  duration: duration / 2
	}, callback);
}

function borrarTodosMarkers(){
	sourceSearch.clear();
	document.getElementById("popup").style.display = "none";
}

function ocultarSearch(){
	document.getElementById("resulSearch-content").style.display="none";
}

function puntos(position, desc, clas, local,dist,image,nombre,id) {
	this.position = position;
	this.desc=desc;
	this.clas=clas;
	this.local=local;
	this.dist=dist;
	this.image=image;
	this.nombre=nombre;
	this.id=id;
	this.codigo=codigo;
}

function ConstruirHtml(coord,desc,clas,local,dist,image,nombre,i){
	var  contentString = "<div>";

	contentString += "<img border='0' src='https://visor.grafcan.es/resources/markers/01.png'/>&nbsp;<a href='javascript:borrarTodosMarkers();'><font style='font-family:Verdana;font-size:10px; font-weight:normal'><b>Quitar Marcadores</b></font></a>";

	if (image!=""){
		contentString += "&nbsp;&nbsp;<a href="+image+" target='_blank'><img width='60' height='60' src="+image+" border='2' style='display:inline;border-color:black'></a>";
	}
	contentString += "";

	//contentString += "<HR>";

	if (nombre != ""){
		contentString += "<center  style=''>";
		contentString +="<font style='font-family:ARIAL;font-size:16px;font-weight:bold;color:#AAAAAA'><b>"+nombre+"</b></font>";
		contentString += "</center>";
		contentString += "<HR>";
	}

	if (desc != ""){
		contentString += "<label>";
		contentString +="<font style='font-size:10px;font-weight:bold;color:#666666'><b>DescripciÃ³n:</b>&nbsp;</font><font style='font-size: 9pt; color: #AAAAAA'>"+desc+"</font>";
		contentString += "</label>";
		contentString +="<br/>";
	}

	if (clas != ""){
		contentString += "<label>";
		contentString +="<font style='font-size: 10px;font-weight:bold;color:#666666'><b>ClasificaciÃ³n:</b>&nbsp;</font><font style='font-size: 9pt; color: #AAAAAA'>"+clas+"</font>";
		contentString += "</label>";
		contentString +="<br/>";
	}

	if (local != ""){
		contentString += "<label>";
		contentString +="<font style='font-size:10px;font-weight:bold;color:#666666'><b>LocalizaciÃ³n:</b>&nbsp;</font><font style='font-size: 9pt; color: #AAAAAA'>"+local+"</font>";
		contentString += "</label>";
		contentString +="<br/>";
	}

	if (dist != ""){
		contentString += "<label>";
		contentString +="<font style='font-size:10px;font-weight:bold;color:#666666'><b>Distancia:</b>&nbsp;</font><font style='font-size: 9pt; color: #AAAAAA'>"+parseFloat(dist).toFixed(2)+"</font>";
		contentString += "</label>";
		contentString +="<br/>";
	}

	contentString += "<center>";
	contentString +="<font style='font-size: 7pt; font-weight: bold; color: #999999'>"+coord+"</font>";
	contentString += "</center>";

	contentString +="</div>";

	return contentString;
}



function include(file){
	var script  = document.createElement('script');
	script.src  = file;
	script.type = 'text/javascript';
	script.defer = true;
	document.getElementsByTagName('head').item(0).appendChild(script);
}

function includeStyle(file){
	var script  = document.createElement('link');
	script.href  = file;
	script.rel = 'stylesheet';
	script.media = 'screen';
	script.type = 'text/css';

	document.getElementsByTagName('head').item(0).appendChild(script);
}

// mapa para incrustar
var svcIDE = {name:'',title:'',url:'',layers:'',format:'',opacity:1,maxZoom:19,query:{}};
function createIDEMap(serviceName,lng,lat,zoom,lyrvis,bCombo,servicesUrl){
	// servicios visor.grafcan.es
	if (typeof servicesUrl=='undefined') {
		servicesUrl = '/visorweb/config/services.xml';
	}
	if (serviceName != ""){
		$.ajax({
			async: false,
			url: servicesUrl,
			dataType: navigator.userAgent.match(/MSIE/gi)?'text':'xml',
			success: function(data,textStatus,jqXHR) {
				var svc = $(data).find('service[name="'+serviceName+'"]');
				if (svc.length==0) {
					svc = $(data).find('service[default=true]');
				}
				svcIDE.name = $(svc).attr('name');
				svcIDE.title = $(svc).attr('desc');
				svcIDE.query.url = $(svc).find('query>queryUrl').text();
				svcIDE.query.layers = $(svc).find('query>queryLayers').text();
				svcIDE.query.byLayers = eval($(svc).find('query').attr('byLayers'));
				svcIDE.layers = [];
				$(svc).find('layer').each(function(index,element) {
					var baseUrl = $(element).find('baseUrl').text()||$(svc).find('defaults>baseUrl').text();
					svcIDE.layers.push({
						name:$(element).attr('name'),
						desc:$(element).attr('desc'),
						url:baseUrl,
						singleTileUrl:jQuery.trim($(element).find('singleTile').text()),
						layers:$(element).find('layers').text(),
						format:$(element).find('format').length?$(element).find('format').text():'image/png',
						opacity:$(element).find('opacity').length&&$(element).find('opacity').text()?eval($(element).find('opacity').text()):1,
						maxZoom:$(element).find('visibility').length?$(element).find('visibility').attr('max'):19,
						visible:lyrvis&&lyrvis.charAt(index)!=''?eval(lyrvis.charAt(index))!=0:eval($(element).attr('visible'))
					});
				});
			},
			error: function(jqXHR,textStatus,errorThrown) {
				alert('Error recuperando servicio: '+textStatus);
			}
		});
	}

	if (!ol.proj.get('EPSG:32628')) proj4.defs('EPSG:32628',"+proj=utm +zone=28 +ellps=WGS84 +datum=WGS84 +units=m +no_defs");

	//Crear los DIV para la Info
	crearPopup();

	var center = ol.proj.transform([lng,lat],'EPSG:4326','EPSG:32628');
	Miview = new ol.View({
		projection: ol.proj.get('EPSG:32628'),
		center: center,
		rotation: 0,
		zoom: zoom
	});

	map = new ol.Map({
	  extent: extent,
	  overlays:[overlay],
	  loadTilesWhileAnimating: true,
	  target: 'map_canvas',
	  controls: ol.control.defaults({}, []),
	  logo: false,
	  view: Miview
	});


	//crear los diferentes DIV para ubicar los botones, cajas, etc...
	crearContenedoresDIV();

	//Crear un SELECT OPTIONS
	if (bCombo){
		var handleCustomControl = function (e) {
			reorganizarCapas(mySelect.value)
		}
		var selectList = document.createElement('select');
		selectList.setAttribute("id", "mySelect");
		selectList.addEventListener('change', handleCustomControl, false);

		myControl = new ol.control.Control({
			element: selectList,
			target: "contenedor_botones"
		});
		map.addControl(myControl);
	}

	if (serviceName != "")
		IDECanarias_crearBotones(svcIDE.name+",wms_OE,wms_TOPO,wms_CA,wms_MIX", bCombo);
	else
		IDECanarias_crearBotones("wms_OE,wms_TOPO,wms_CA,wms_MIX", bCombo);

	loadWMS(serv[0]);

	eventosMapa();

	//variables para mostrar los markers de las busquedas
	sourceSearch = new ol.source.Vector();
	layerSearch = new ol.layer.Vector({source:sourceSearch});

	return map;
}
function addIDELayers(){
	$(svcIDE.layers).each(function(index,layer) {
		map.addLayer(
			new ol.layer.Tile({
				name:layer.name,
				opacity:layer.opacity,
				extent:extent,
				visible:layer.visible,
				source:new ol.source.TileWMS({
					url:layer.url,
					params:{'VERSION':'1.1.1','LAYERS':layer.layers,'FORMAT':layer.format,'TRANSPARENT':layer.format.match(/png|gif/gi)?true:false,'CRS':'EPSG:32628'}
				})
			})
		);
		if (svcIDE.query.byLayers) cargar_urlQueryInfo(layer.url,layer.layers,layer.layers,layer.format);
	});
	if (!svcIDE.query.byLayers) cargar_urlQueryInfo(svcIDE.query.url,svcIDE.query.layers,svcIDE.query.layers,'image/png');
}
