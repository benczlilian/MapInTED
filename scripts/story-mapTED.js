var map;
var scroller;
var markers = []; 
var overlays = []; 
var extraMarkersGroup;

var vectorCache = {}; 

var showLayers = true; 
var currentChapterIndex = -1; 

function initStoryMap(data) {
    var isMobile = (window.innerWidth <= 768) || (L.Browser.mobile);

    var startLat = -25.4284;
    var startLon = -49.2733;
    var startZoom = 12;

    if (data.length > 0) {
        var firstValidRow = data.find(row => row.Latitude && row.Latitude.trim() !== "");
        if (firstValidRow) {
            startLat = parseFloat(firstValidRow.Latitude.replace(',', '.'));
            startLon = parseFloat(firstValidRow.Longitude.replace(',', '.'));
            startZoom = parseFloat(firstValidRow.Zoom) || 12;
        }
    }

    data.forEach(row => {
        if (row.Overlay) {
            var inputs = row.Overlay.split(',');
            inputs.forEach(input => {
                var url = input.trim();
                var lower = url.toLowerCase();
                if ((lower.endsWith('.geojson') || lower.endsWith('.json')) && !vectorCache[url]) {
                    vectorCache[url] = fetch(url)
                        .then(res => res.json())
                        .catch(err => console.error("Falha no pré-load:", url));
                }
            });
        }
    });

    // --- MAPA ---
    map = L.map('map', {
        center: [startLat, startLon], 
        zoom: startZoom,
        zoomControl: false,     
        scrollWheelZoom: false, 
        dragging: !isMobile,
        touchZoom: !isMobile,
        doubleClickZoom: !isMobile,
        tap: true 
    });

    if (isMobile) {
        map.dragging.disable();
        map.touchZoom.disable();
        map.doubleClickZoom.disable();
        map.scrollWheelZoom.disable();
        map.boxZoom.disable();
        map.keyboard.disable();
    }

    L.maplibreGL({
        style: 'https://api.maptiler.com/maps/019dd5eb-2677-7312-8187-e1eec3206e2a/style.json?key=mJszyGhKhVRJv3iG1dvu',
        attribution: '\u003ca href="https://www.maptiler.com/copyright/" target="_blank"\u003e\u0026copy; MapTiler\u003c/a\u003e \u003ca href="https://www.openstreetmap.org/copyright" target="_blank"\u003e\u0026copy; OpenStreetMap contributors\u003c/a\u003e'
    }).addTo(map);

    extraMarkersGroup = L.layerGroup().addTo(map);
    L.control.zoom({ position: 'topleft' }).addTo(map);
    setTimeout(function(){ map.invalidateSize(); }, 500);

    // --- BOTÕES FLUTUANTES ---
    var controlsDiv = document.createElement('div');
    controlsDiv.id = 'floating-controls';
    document.body.appendChild(controlsDiv);

    var layerBtn = document.createElement('button');
    layerBtn.className = 'btn-floating btn-layer'; 
    layerBtn.innerHTML = 'Layers';
    
    layerBtn.onclick = function() {
        showLayers = !showLayers;
        if (showLayers) {
            layerBtn.classList.remove('layers-off');
            layerBtn.innerHTML = 'Layers';
        } else {
            layerBtn.classList.add('layers-off');
            layerBtn.innerHTML = 'Ocultar Layers';
        }
        
        if (currentChapterIndex >= 0 && overlays[currentChapterIndex]) {
            var currentLayers = overlays[currentChapterIndex]; 
            currentLayers.forEach(function(layerObj) {
                if (layerObj && layerObj.layerInstance) {
                    if (showLayers) {
                        if (!map.hasLayer(layerObj.layerInstance)) map.addLayer(layerObj.layerInstance);
                        if (layerObj.type === 'geojson' && window.mapLegend && !map.hasControl(window.mapLegend)) {
                            window.mapLegend.addTo(map);
                        }
                    } else {
                        if (map.hasLayer(layerObj.layerInstance)) map.removeLayer(layerObj.layerInstance);
                        if (window.mapLegend) map.removeControl(window.mapLegend);
                    }
                }
            });
        }
    };
    controlsDiv.appendChild(layerBtn);

    var toggleBtn = document.getElementById('toggle-mode');
    if (toggleBtn) {
        toggleBtn.classList.add('btn-floating');
        controlsDiv.appendChild(toggleBtn);
    }

    var storyContainer = document.getElementById('story');
    var chapters = [];

    // HEADER
    var headerId = 'header-step';
    var headerDiv = document.createElement('div');
    headerDiv.setAttribute('id', headerId);
    headerDiv.classList.add('step'); 
    
    headerDiv.innerHTML = `
        <video id="video-piece-title-video" preload="auto" playsinline="" autoplay="" muted="" loop="" poster="">
            <source src="https://static.videezy.com/system/resources/previews/000/004/940/original/In_the_Trees_4K_Living_Background.mp4" type="video/mp4">
        </video>
        <div class="header-content">
            <img src="https://lageamb.ufpr.br/wp-content/uploads/2024/07/logo1-1-1536x527.png" alt="TED INCRA UFPR" class="header-image">
            <h1> </h1>
            <p>Regularização Fundiária das Ocupações Incidentes em Áreas Rurais da União e do Incra-PR</p>
        </div>
        <div id="scroll-overlay"> </div>
    `;
    storyContainer.insertBefore(headerDiv, storyContainer.firstChild);

    chapters.push({ id: headerId, index: -1, isHeader: true, extraMarkersData: [] });

    // LOOP DADOS 
    data.forEach((row, i) => {
        var hasLocation = row.Latitude && row.Latitude.trim() !== "" && row.Longitude && row.Longitude.trim() !== "";
        
        var lat = null;
        var lon = null;
        var zoomLevel = 12;
        var marker = null;

        if (hasLocation) {
            lat = parseFloat(row.Latitude.replace(',', '.'));
            lon = parseFloat(row.Longitude.replace(',', '.'));
            zoomLevel = parseFloat(row.Zoom) || 12;
            
            var customIcon = (typeof tedIcon !== 'undefined') ? tedIcon : ((typeof lageambIcon !== 'undefined') ? lageambIcon : null);
            marker = L.marker([lat, lon], { icon: customIcon, opacity: 0 });
            marker.addTo(map); 
        }
        markers.push(marker);

        // EXTRAS
        var chapterExtras = [];
        if (row['Extra Markers'] && row['Extra Markers'].trim() !== "") {
            var rawExtras = row['Extra Markers'].split(';'); 
            rawExtras.forEach(function(item) {
                var parts = item.split('|'); 
                if (parts.length >= 3) {
                    var exLat = parseFloat(parts[0].trim().replace(',', '.'));
                    var exLon = parseFloat(parts[1].trim().replace(',', '.'));
                    var exText = parts[2].trim();
                    var iconToUse = (typeof pinhaoIcon !== 'undefined') ? pinhaoIcon : ((typeof tedIcon !== 'undefined') ? tedIcon : null);

                    if (parts.length >= 4) {
                        var iconFile = parts[3].trim();
                        if (iconFile !== "") {
                            iconToUse = L.icon({
                                iconUrl: 'media/' + iconFile,
                                iconSize: [32, 32], 
                                iconAnchor: [16, 16],
                                popupAnchor: [0, -16],
                                className: 'custom-extra-marker' 
                            });
                        }
                    }
                    var extraMarker = L.marker([exLat, exLon], { icon: iconToUse, opacity: 1 });
                    extraMarker.bindPopup(exText);
                    chapterExtras.push(extraMarker);
                }
            });
        }
        
        // OVERLAYS
        var chapterLayers = []; 
        if (row.Overlay && row.Overlay.trim() !== "") {
            var inputs = row.Overlay.split(',');
            var opacities = [];
            if (row['Overlay Transparency']) {
                opacities = row['Overlay Transparency'].toString().split(',');
            }
            inputs.forEach(function(rawInput, idx) {
                var input = rawInput.trim();
                if (input === "") return;
                var currentOpacity = 0.8; 
                if (opacities[idx]) currentOpacity = parseFloat(opacities[idx].trim()) || 0.8;
                else if (opacities.length > 0) currentOpacity = parseFloat(opacities[0].trim()) || 0.8;

                var layerObj = null;
                var inputLower = input.toLowerCase(); 

                if (inputLower.endsWith('.geojson') || inputLower.endsWith('.json')) {
                    layerObj = { type: 'geojson', url: input, layerInstance: null, opacity: currentOpacity };
                } else if (inputLower.endsWith('.tif') || inputLower.endsWith('.tiff')) {
                    layerObj = { type: 'geotiff', url: input, layerInstance: null, opacity: currentOpacity };
                } else if (inputLower.includes('{z}') && inputLower.includes('{x}')) {
                    layerObj = { type: 'xyz', url: input, layerInstance: null, opacity: currentOpacity };
                } else {
                    var layerName = input;
                    var wmsUrl = 'https://ide.lageamb.ufpr.br/geoserver/ows';
                    if (!layerName.includes(':') && !layerName.startsWith('http')) layerName = 'geonode:' + layerName;
                    
                    if (layerName.startsWith('http')) {
                        layerObj = { type: 'image', url: input, layerInstance: null };
                    } else {
                        var wmsLayer = L.tileLayer.wms(wmsUrl, {
                            layers: layerName, 
                            format: 'image/png', 
                            transparent: true,
                            opacity: currentOpacity,
                            noWrap: true,
                            tms: false,
                            updateWhenIdle: true,
                            keepBuffer: 2
                        });
                        layerObj = { type: 'wms', layerInstance: wmsLayer };
                    }
                }
                if (layerObj) chapterLayers.push(layerObj);
            });
        }
        overlays.push(chapterLayers); 

        // HTML
        var chapterId = 'chapter-' + i;
        var container = document.createElement('div');
        container.setAttribute('id', chapterId);
        container.classList.add('step');

        var alignValue = (row['Align'] || row['Alinhamento'] || 'direita').trim().toLowerCase();
        
        if (alignValue === 'esquerda') {
            container.classList.add('align-left');
        } else if (alignValue === 'centro') {
            container.classList.add('align-center');
        } else {
            container.classList.add('align-right');  
        }

        var content = document.createElement('div');
        content.classList.add('light');
        if (row.Chapter) content.innerHTML += `<h3>${row.Chapter}</h3>`;
        
        if (row['Media Link']) {
            var m = row['Media Link'].trim();
            var mLower = m.toLowerCase(); 
            if (mLower.includes('youtube') || mLower.includes('youtu.be')) {
                var videoId = m.split('v=')[1];
                if(videoId && videoId.indexOf('&') != -1) videoId = videoId.split('&')[0];
                var embedUrl = "https://www.youtube.com/embed/" + videoId;
                content.innerHTML += `<div class="video-container"><iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe></div>`;
            } else if (mLower.endsWith('.mp3') || mLower.endsWith('.wav') || mLower.endsWith('.ogg')) {
                content.innerHTML += `<div style="margin: 20px 0;"><audio controls style="width: 100%;"><source src="${m}" type="audio/mpeg"></audio></div>`;
            } else if (mLower.endsWith('.mp4') || mLower.endsWith('.webm') || mLower.endsWith('.mov')) {
                 content.innerHTML += `<div class="video-container" style="padding-bottom: 0; height: auto;"><video controls style="width: 100%; border-radius: 5px;"><source src="${m}" type="video/mp4"></video></div>`;
            } else {
                content.innerHTML += `<img src="${m}" alt="${row.Chapter}">`;
            }
            if (row['Media Credit']) content.innerHTML += `<p class="caption">${row['Media Credit']}</p>`;
        }
        if (row.Description) content.innerHTML += `<p>${row.Description}</p>`;
        container.appendChild(content);
        storyContainer.appendChild(container);

        chapters.push({ 
            id: chapterId, index: i, location: hasLocation ? [lat, lon] : null, zoom: zoomLevel, isHeader: false, extraMarkersData: chapterExtras 
        });
    });

    // RODAPÉ
    var footerVideoId = 'footer-video-step';
    var footerVideoDiv = document.createElement('div');
    footerVideoDiv.setAttribute('id', footerVideoId);
    footerVideoDiv.classList.add('step'); 
    
    footerVideoDiv.innerHTML = `
        <video id="video-final-full" preload="auto" playsinline="" controls>
            <source src="https://static.videezy.com/system/resources/previews/000/015/506/original/Viaduct_Slovakia_1.mp4" type="video/mp4">
        </video>
        <div class="header-content"></div>
    `;
    storyContainer.appendChild(footerVideoDiv);

    chapters.push({ id: footerVideoId, index: -2, isFooter: true, extraMarkersData: [] });

    // LIGHTBOX
    $('body').append('<div id="lightbox"><span id="lightbox-close">&times;</span><div id="lightbox-content"></div></div>');
    
    $(document).on('click', '.step img', function(e) {
        var parentStep = $(this).closest('.step');
        if (parentStep.attr('id') === 'header-step' || parentStep.attr('id') === 'footer-video-step') return;
        
        if ($('#story').hasClass('story-hidden')) { e.preventDefault(); e.stopPropagation(); return; }
        $('#lightbox-content').html('<img src="' + $(this).attr('src') + '">');
        $('#lightbox').addClass('active');
    });

    $(document).on('click', '.step video', function(e) {
        var parentStep = $(this).closest('.step');
        if (parentStep.attr('id') === 'header-step' || parentStep.attr('id') === 'footer-video-step' || this.id === 'video-final-full') return;
        
        if ($('#story').hasClass('story-hidden')) { e.preventDefault(); e.stopPropagation(); return; }
        $('#lightbox-content').html(`<video controls autoplay style="max-width: 100%; max-height: 90vh;"><source src="${$(this).find('source').attr('src')}" type="video/mp4"></video>`);
        $('#lightbox').addClass('active');
    });

    $(document).on('click', '#lightbox, #lightbox-close', function(e) {
        if (e.target.id === 'lightbox' || e.target.id === 'lightbox-close') {
            $('#lightbox').removeClass('active');
            setTimeout(function(){ $('#lightbox-content').empty(); }, 300); 
        }
    });

    $('#loader').fadeOut();

    scroller = scrollama();

    scroller
        .setup({ step: '.step', offset: 0.5, progress: true })
        .onStepEnter(response => {
            var chapter = chapters.find(c => c.id === response.element.id);
            if (!chapter) return; 

            $('.step').removeClass('active');
            response.element.classList.add('active');

            var currentIsMobile = (window.innerWidth <= 768) || (L.Browser.mobile);
            
            if (chapter.isHeader || chapter.isFooter) {
                $('#floating-controls').addClass('buttons-hidden');
                currentChapterIndex = -1; 
                markers.forEach(m => { if(m) m.setOpacity(0); });
                extraMarkersGroup.clearLayers(); 
                overlays.forEach(chapterLayers => {
                    chapterLayers.forEach(obj => {
                        if (obj && obj.layerInstance && map.hasLayer(obj.layerInstance)) {
                            map.removeLayer(obj.layerInstance);
                            if(window.mapLegend) { map.removeControl(window.mapLegend); window.mapLegend = null; }
                        }
                    });
                });

            } else {
                $('#floating-controls').removeClass('buttons-hidden'); 

                if (chapter.location) {
                    if (currentIsMobile) {
                        map.setView(chapter.location, chapter.zoom);
                    } else {
                        map.flyTo(chapter.location, chapter.zoom, { 
                            animate: true, duration: 3.5, easeLinearity: 0.25 
                        });
                    }
                }

                var idx = chapter.index;
                currentChapterIndex = idx; 

                var activeMarkerIdx = -1;
                for (var j = idx; j >= 0; j--) {
                    if (markers[j]) {
                        activeMarkerIdx = j;
                        break;
                    }
                }

                markers.forEach((m, i) => {
                    if (m) {
                        if (i === activeMarkerIdx) { 
                            m.setOpacity(1); 
                            if(m.getElement()) m.getElement().style.pointerEvents = 'auto'; 
                        } else { 
                            m.setOpacity(0); 
                            if(m.getElement()) m.getElement().style.pointerEvents = 'none'; 
                        }
                    }
                });

                extraMarkersGroup.clearLayers(); 
                if (chapter.extraMarkersData && chapter.extraMarkersData.length > 0) {
                    chapter.extraMarkersData.forEach(function(m) {
                        extraMarkersGroup.addLayer(m); 
                    });
                }

                overlays.forEach((chapterLayers, i) => {
                    if (i !== idx) {
                        chapterLayers.forEach(obj => {
                            if (obj && obj.layerInstance && map.hasLayer(obj.layerInstance)) {
                                map.removeLayer(obj.layerInstance);
                                if(window.mapLegend) { map.removeControl(window.mapLegend); window.mapLegend = null; }
                            }
                        });
                    }
                });
                
                var currentLayers = overlays[idx];
                if (currentLayers && currentLayers.length > 0) {
                    currentLayers.forEach(function(currentOverlay) {
                        
                        var prepareLayer = function() {
                            if (currentOverlay.type === 'wms') {
                            } 
                            else if (currentOverlay.type === 'image') {
                                if(!currentOverlay.layerInstance) {
                                    currentOverlay.layerInstance = L.tileLayer(currentOverlay.url, { noWrap: true, tms: false });
                                }
                            }
                            else if (currentOverlay.type === 'xyz') {
                                if(!currentOverlay.layerInstance) {
                                    currentOverlay.layerInstance = L.tileLayer(currentOverlay.url, { 
                                        opacity: currentOverlay.opacity,
                                        tms: false,
                                        maxZoom: 18
                                    });
                                    if(currentChapterIndex === idx && showLayers) currentOverlay.layerInstance.addTo(map);
                                }
                            }
                            else if (currentOverlay.type === 'geojson') {
                                if (!currentOverlay.layerInstance) {
                                    
                                    // 
                                    var customStyle = function(feature) {
                                        var corPreenchimento = 'transparent'; 
                                        
                                        for (var coluna in feature.properties) {
                                            var valor = feature.properties[coluna];
                                            if (typeof geojsonCores !== 'undefined' && geojsonCores[valor]) {
                                                corPreenchimento = geojsonCores[valor];
                                                break;
                                            }
                                        }

                                        return { 
                                            radius: 8,                    
                                            color: '#477447',             
                                            fillColor: corPreenchimento,  
                                            weight: 1,                    
                                            opacity: 1,                   
                                            fillOpacity: (currentOverlay.opacity || 0.8) 
                                        };
                                    };

                                   
                                    var geojsonOptions = {
                                        style: customStyle,
                                        pointToLayer: function (feature, latlng) {
                                            return L.circleMarker(latlng, customStyle(feature));
                                        }
                                    };

                                    
                                    var createLegend = function(dadosGeojson) {
                                        if (window.mapLegend) { map.removeControl(window.mapLegend); }
                                        
                                        var classesNesteMapa = [];
                                        if (dadosGeojson && dadosGeojson.features && typeof geojsonCores !== 'undefined') {
                                            dadosGeojson.features.forEach(function(f) {
                                                for (var col in f.properties) {
                                                    var val = f.properties[col];
                                                    if (geojsonCores[val] && !classesNesteMapa.includes(val)) {
                                                        classesNesteMapa.push(val);
                                                    }
                                                }
                                            });
                                        }

                                        if (classesNesteMapa.length === 0) return;

                                        // Legenda
                                        window.mapLegend = L.control({position: 'bottomleft'});
                                        window.mapLegend.onAdd = function (map) {
                                            var div = L.DomUtil.create('div', 'info legend');
                                            div.style.marginBottom = '80px'; 
                                            div.style.marginLeft = '20px';
                                            div.innerHTML += '<h4>Legenda</h4>';
                                            classesNesteMapa.forEach(function(classe) {
                                                var cor = geojsonCores[classe];
                                                div.innerHTML += '<i style="background:' + cor + '"></i> ' + classe + '<br>';
                                            });
                                            return div;
                                        };
                                        window.mapLegend.addTo(map);
                                    };

                                    //RENDERIZAÇÃO
                                    if (vectorCache[currentOverlay.url]) {
                                        vectorCache[currentOverlay.url].then(data => {
                                            currentOverlay.layerInstance = L.geoJSON(data, geojsonOptions);
                                            currentOverlay.layerInstance.geojsonData = data; 
                                            if(currentChapterIndex === idx && showLayers) {
                                                currentOverlay.layerInstance.addTo(map);
                                                createLegend(data); 
                                            }
                                        });
                                    } else {
                                        fetch(currentOverlay.url)
                                            .then(res => res.json())
                                            .then(data => {
                                                currentOverlay.layerInstance = L.geoJSON(data, geojsonOptions);
                                                currentOverlay.layerInstance.geojsonData = data; 
                                                if(currentChapterIndex === idx && showLayers) {
                                                    currentOverlay.layerInstance.addTo(map);
                                                    createLegend(data); 
                                                }
                                            })
                                            .catch(err => console.error("Erro GeoJSON:", err));
                                    }
                                    return false; 
                                } else {
                                     
                                    if(currentChapterIndex === idx && showLayers && !window.mapLegend) {
                                        var dadosSalvos = currentOverlay.layerInstance.geojsonData;
                                        var classesNesteMapa = [];
                                        if (dadosSalvos && dadosSalvos.features && typeof geojsonCores !== 'undefined') {
                                            dadosSalvos.features.forEach(function(f) {
                                                for (var col in f.properties) {
                                                    var val = f.properties[col];
                                                    if (geojsonCores[val] && !classesNesteMapa.includes(val)) classesNesteMapa.push(val);
                                                }
                                            });
                                        }
                                        if (classesNesteMapa.length > 0) {
                                            
                                            window.mapLegend = L.control({position: 'bottomleft'});
                                            window.mapLegend.onAdd = function (map) {
                                                var div = L.DomUtil.create('div', 'info legend');
                                                div.style.marginBottom = '80px'; 
                                                div.style.marginLeft = '20px';
                                                div.innerHTML += '<h4>Legenda</h4>';
                                                classesNesteMapa.forEach(function(classe) {
                                                    var cor = geojsonCores[classe];
                                                    div.innerHTML += '<i style="background:' + cor + '"></i> ' + classe + '<br>';
                                                });
                                                return div;
                                            };
                                            window.mapLegend.addTo(map);
                                        }
                                    }
                                }
                            }
                            else if (currentOverlay.type === 'geotiff') {
                                if (!currentOverlay.layerInstance) {
                                    fetch(currentOverlay.url)
                                        .then(response => response.arrayBuffer())
                                        .then(arrayBuffer => {
                                            parseGeoraster(arrayBuffer).then(georaster => {
                                                currentOverlay.layerInstance = new GeoRasterLayer({
                                                    georaster: georaster,
                                                    opacity: currentOverlay.opacity,
                                                    resolution: 128
                                                });
                                                if(currentChapterIndex === idx && showLayers) {
                                                    currentOverlay.layerInstance.addTo(map);
                                                }
                                            });
                                        })
                                        .catch(err => console.error("Erro ao carregar GeoTIFF:", err));
                                    return false; 
                                }
                            }
                            return true; 
                        };

                        var ready = prepareLayer();
                        if (ready && showLayers && currentOverlay.layerInstance) {
                            if (!map.hasLayer(currentOverlay.layerInstance)) currentOverlay.layerInstance.addTo(map);
                        }
                    });
                }
            }
        })
        .onStepExit(response => {
            var chapter = chapters.find(c => c.id === response.element.id);
            if (chapter) response.element.classList.remove('active');
        });

    window.addEventListener('resize', scroller.resize);

    $(document).off('click', '#toggle-mode');
    
    $(document).on('click', '#toggle-mode', function(e) {
        e.preventDefault(); 
        var storyDiv = $('#story');
        var btn = $(this);
        var currentIsMobile = (window.innerWidth <= 768) || (L.Browser.mobile);
        
        storyDiv.toggleClass('story-hidden');
        var isHidden = storyDiv.hasClass('story-hidden');

        if (isHidden) {
             btn.html('Ver História');
             map.dragging.enable();
            
            if (!currentIsMobile) {
                map.touchZoom.enable();
                map.doubleClickZoom.enable();
                map.scrollWheelZoom.enable();
            } else {
                map.touchZoom.disable();
                map.doubleClickZoom.disable();
            }
            if (map.tap) map.tap.enable();
            $('#map').css('cursor', 'grab');

        } else {
             btn.html('Ver Mapa');
             map.scrollWheelZoom.disable();

            if (currentIsMobile) {
                map.dragging.disable();
                map.touchZoom.disable();
                map.doubleClickZoom.disable();
            }
            scroller.resize();
        }
    });
}

$(document).ready(function() {
    if (typeof googleDocURL !== 'undefined' && googleDocURL && typeof googleApiKey !== 'undefined' && googleApiKey) {
        var spreadsheetId = googleDocURL.split('/d/')[1].split('/')[0];
        $.ajax({
            url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Chapters?key=${googleApiKey}`,
            dataType: 'json',
            success: function(response) { initStoryMap(parseGoogleSheetData(response.values)); },
            error: function(e) { console.error("Erro API:", e); $('#loader').html("Erro ao carregar."); }
        });
    } else { alert('Configure google-doc-url.js'); }
});

function parseGoogleSheetData(rows) {
    if (!rows || rows.length === 0) return [];
    var headers = rows[0];
    var data = [];
    for (var i = 1; i < rows.length; i++) {
        var row = rows[i]; var obj = {};
        for (var j = 0; j < headers.length; j++) { obj[headers[j]] = row[j] ? row[j] : ""; }
        data.push(obj);
    }
    return data;
}