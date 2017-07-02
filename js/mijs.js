window.onload = function () {


    var mitexto = "joder";
    var mipoligono = "kml/borr.kml";
    var mismarcadores = "kml/borrar.kml";
    var mijson = 'kml/joder.json';

          var textFill = new ol.style.Fill({
        color: '#fff'
      });
      var textStroke = new ol.style.Stroke({
          color: 'rgba(0, 0, 0, 0.6)',
          width: 3
      });

    var map = new ol.Map({

        target: 'map',
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM()
            })

            /*
             new ol.layer.Vector({
             source: new ol.source.Vector({
             url: mipoligono,
             format: new ol.format.KML({
             extractStyles: false

             })

             }),
             style: new ol.style.Style({
             fill: new ol.style.Fill({
             color: 'blue'
             }),
             stroke: new ol.style.Stroke({
             color: 'olive',
             width: 1
             })
             })
             }),

             new ol.layer.Vector({
             source: new ol.source.Vector({
             url: mismarcadores,
             format: new ol.format.KML({
             extractStyles: false
             })
             }),





             style: new ol.style.Style({
             image: new ol.style.Circle({
             radius: 6,
             fill: new ol.style.Fill({color: 'white'})
             })
             })





             }),




             new ol.layer.Vector({
             title: 'Earthquakes',
             source: new ol.source.Vector({
             url: mijson,
             format: new ol.format.GeoJSON()
             }),
             style: new ol.style.Style({
             text: new ol.style.Text({

             text: mitexto,
             fill : new ol.style.Fill ({
             color: '#FFD352'
             }),
             stroke : new ol.style.Stroke ({
             color: '#daff58',
             width: 3
             })


             }),
             image: new ol.style.Circle({
             radius: 10,
             fill: new ol.style.Fill({
             color: '#0000FF'
             }),
             stroke: new ol.style.Stroke({
             color: '#000000'
             })
             })
             })





             })*/
        ],
        view: new ol.View({
            projection: 'EPSG:4326',
            center: [-17.85, 28.68],
            zoom: 10

        })

    });


    // Crea los markers que el usuario halla definido en un Array de entrada
// Array(Lat,Lon,HTML)
    crearMarcadores(mibd);
    function crearMarcadores(infoMARKER) {

        var numMarkers = infoMARKER.length;
        var source = new ol.source.Vector();
        var layerVector = new ol.layer.Vector({
            source: source
        });


    for (var j = 0; j < numMarkers; j++) {

        var marker = new ol.Feature({
            geometry: new ol.geom.Point([infoMARKER[j][0], infoMARKER[j][1]])

        });
        var valor = infoMARKER [j][2];

        var iconImage = new ol.style.Style({
            image: new ol.style.Circle({
                radius: 20 * infoMARKER[j][2],
                fill: new ol.style.Fill({color: '#2E9AFE'})
            }),
             text: new ol.style.Text({

             text: valor.toString(),
             fill: textFill,
              stroke: textStroke



             })



        });






        marker.setStyle(iconImage);
        marker.set("html", infoMARKER[j][2]);
        source.addFeature(marker);

    }

    map.addLayer(layerVector);

}


};
