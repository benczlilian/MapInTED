var map;
var scroller;
var markers = []; 
var overlays = []; 
var extraMarkersGroup;

var vectorCache = {}; 

var showLayers = true; 
var currentChapterIndex = -1; 

window.hiddenClasses = {};

function initStoryMap(data) {
    var isMobile = (window.innerWidth <= 768) || (L.Browser.mobile);

    var startLat = -24.484127;
    var startLon = -52.169832;
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

    // MAPA 
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
        style: 'https://api.maptiler.com/maps/01a0f33a-085b-7cf2-872d-0d28fd9e4d04/style.json?key=mJszyGhKhVRJv3iG1dvu',
        attribution: '\u003ca href="https://www.maptiler.com/copyright/" target="_blank"\u003e\u0026copy; MapTiler\u003c/a\u003e \u003ca href="https://www.openstreetmap.org/copyright" target="_blank"\u003e\u0026copy; OpenStreetMap contributors\u003c/a\u003e'
    }).addTo(map);

    L.tileLayer('https://api.maptiler.com/tiles/hillshade/{z}/{x}/{y}.png?key=mJszyGhKhVRJv3iG1dvu', {
        opacity: 0.3,
        maxZoom: 18,
        
        
    }).addTo(map);

    extraMarkersGroup = L.layerGroup().addTo(map);
    L.control.zoom({ position: 'topleft' }).addTo(map);

    map.on('zoomend', function() {
        var zoomAtual = map.getZoom();
        extraMarkersGroup.eachLayer(function(marker) {
            if (marker.originalLatLng && marker.offsetLatLng && marker.zoomBase) {
                if (zoomAtual > marker.zoomBase + 1) {
                    marker.setLatLng(marker.originalLatLng);
                } else {
                    marker.setLatLng(marker.offsetLatLng);
                }
            }
        });
    });

    setTimeout(function(){ map.invalidateSize(); }, 500);

    // BOTÕES 
    var controlsDiv = document.createElement('div');
    controlsDiv.id = 'floating-controls';
    document.body.appendChild(controlsDiv);

    /*var layerBtn = document.createElement('button');
    layerBtn.className = 'btn-floating btn-layer'; 
    layerBtn.innerHTML = 'Layers';
    
    layerBtn.onclick = function() {
        showLayers = !showLayers;
        if (showLayers) {
            layerBtn.classList.remove('layers-off');
            layerBtn.innerHTML = 'Layers';
        } else {
            layerBtn.classList.add('layers-off');
            layerBtn.innerHTML = 'Ver layers';
        }
        
        if (currentChapterIndex >= 0 && overlays[currentChapterIndex]) {
            var currentLayers = overlays[currentChapterIndex]; 
            currentLayers.forEach(function(layerObj) {
                if (layerObj && layerObj.layerInstance) {
                    if (showLayers) {
                        if (!map.hasLayer(layerObj.layerInstance)) map.addLayer(layerObj.layerInstance);
                    } else {
                        if (map.hasLayer(layerObj.layerInstance)) map.removeLayer(layerObj.layerInstance);
                    }
                }
            });
            if (showLayers) updateCombinedLegend(currentChapterIndex);
            else if (window.mapLegend) { map.removeControl(window.mapLegend); window.mapLegend = null; }
        }
    };
    controlsDiv.appendChild(layerBtn);*/

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
            <source src="media/TED_SO.mp4" type="video/mp4">
        </video>
        <div class="header-content">
            <img src="https://lageamb.ufpr.br/wp-content/uploads/2024/07/logo1-1-1536x527.png" alt="TED INCRA UFPR" class="header-image">
            <p>Regularização Fundiária das Ocupações Incidentes em Áreas Rurais da União e do Incra-PR</p>
        </div> 
        
        <div class="dynamic-scroll-indicator">
            <p>Role ou deslize<br>para iniciar</p>
            <div class="scroll-animation-group">
                <div class="mouse-icon">
                    <div class="wheel"></div>
                </div>
                <div class="chevron-arrows">
                    <span></span><span></span><span></span>
                </div>
            </div>
        </div>
    `;

    storyContainer.insertBefore(headerDiv, storyContainer.firstChild);
    chapters.push({ id: headerId, index: -1, isHeader: true, extraMarkersData: [] });

    function updateCombinedLegend(chapterIndex) {
        if (window.mapLegend) {
            map.removeControl(window.mapLegend);
            window.mapLegend = null;
        }

        var currentLayers = overlays[chapterIndex];
        if (!currentLayers) return;

        var legendContentHTML = '';
        var classesJaAdicionadas = []; 
        var configsUsadas = []; 
        var geomTypes = {}; 

        currentLayers.forEach(function(layerObj) {
            if (layerObj.type === 'geojson' && layerObj.layerInstance && layerObj.layerInstance.geojsonData) {
                var configAtual = (typeof geojsonConfigs !== 'undefined' && layerObj.configKey) 
                                    ? geojsonConfigs[layerObj.configKey] : null;
                
                if (configAtual && configAtual.cores) {
                    if (!configsUsadas.includes(layerObj.configKey)) configsUsadas.push(layerObj.configKey);

                    if (layerObj.layerInstance.geojsonData.features.length > 0) {
                        geomTypes[layerObj.configKey] = layerObj.layerInstance.geojsonData.features[0].geometry.type;
                    }

                    if (typeof configAtual.cores === 'object') {
                        layerObj.layerInstance.geojsonData.features.forEach(function(f) {
                            for (var col in f.properties) {
                                var val = f.properties[col];
                                if (configAtual.cores[val] && !classesJaAdicionadas.includes(val)) {
                                    classesJaAdicionadas.push(val);
                                }
                            }
                        });
                    } else if (typeof configAtual.cores === 'string') {
                        if (!classesJaAdicionadas.includes(layerObj.configKey)) {
                            classesJaAdicionadas.push(layerObj.configKey);
                        }
                    }
                }
            }
        });

        configsUsadas.forEach(function(configKey) {
            var configAtual = geojsonConfigs[configKey];
            if (!configAtual) return;

            var geomType = geomTypes[configKey] || 'Polygon';
            var isLine = geomType === 'LineString' || geomType === 'MultiLineString';
            var isPoint = geomType === 'Point' || geomType === 'MultiPoint';

            function getLegendIconStyle(cor, isHidden, opacidade, config) {
                var bgCor = isHidden ? '#e5ede1' : cor;
                
                var baseBorda = (config && config.corBorda !== undefined) ? config.corBorda : cor;
                var bordaCor = isHidden ? '#5A8832' : baseBorda;
                
                var opac = isHidden ? 0.5 : opacidade;
                
                var pesoBorda = (config && config.pesoBorda !== undefined) ? config.pesoBorda : (isLine ? 3 : 1);
                
                var espessuraVisual = pesoBorda > 3 ? 3 : (pesoBorda < 1 ? 1 : pesoBorda);

                var diametro = (config && config.tamanhoPonto !== undefined) ? config.tamanhoPonto * 2 : 12;

                if (isLine) {
                    return 'background:' + bordaCor + '; opacity:' + opac + '; width: 16px; height: ' + (pesoBorda > 1 ? pesoBorda : 4) + 'px; display: inline-block; vertical-align: middle; margin-right: 8px; border-radius: 2px;';
                } else if (isPoint) {
                    return 'background:' + bgCor + '; opacity:' + opac + '; width: ' + diametro + 'px; height: ' + diametro + 'px; display: inline-block; vertical-align: middle; margin-right: 8px; border-radius: 50%; border: ' + espessuraVisual + 'px solid ' + bordaCor + ';';
                } else {
                    return 'background:' + bgCor + '; opacity:' + opac + '; width: 14px; height: 14px; display: inline-block; vertical-align: middle; margin-right: 8px; border: ' + espessuraVisual + 'px solid ' + bordaCor + ';';
                }
            }

            if (typeof configAtual.cores === 'object') {
                Object.keys(configAtual.cores).forEach(function(chaveOrdenada) {
                    if (classesJaAdicionadas.includes(chaveOrdenada)) {
                        var cor = configAtual.cores[chaveOrdenada];
                        var isHidden = window.hiddenClasses && window.hiddenClasses[chaveOrdenada];
                        var opacidadeLegenda = (configAtual.opacidadePreenchimento !== undefined) ? configAtual.opacidadePreenchimento : 0.8;
                        
                        var textStyle = isHidden ? 'text-decoration: line-through; opacity: 0.5;' : '';
                        var iconStyle = getLegendIconStyle(cor, isHidden, opacidadeLegenda, configAtual);
                        
                        legendContentHTML += '<div onclick="window.toggleLegendClass(\'' + chaveOrdenada + '\')" style="display: flex; align-items: center; cursor: pointer; margin-bottom: 6px; transition: 0.2s; width: 100%; ' + textStyle + '" title="Clique para filtrar">' +
                                             '<i style="' + iconStyle + ' transition: 0.2s; flex-shrink: 0;"></i><span style="flex-grow: 1; text-align: left; margin-right: 10px;">' + chaveOrdenada + '</span>' + 
                                             '</div>';
                    }
                });
            } else if (typeof configAtual.cores === 'string') {
                if (classesJaAdicionadas.includes(configKey)) {
                    var cor = configAtual.cores;
                    var isHidden = window.hiddenClasses && window.hiddenClasses[configKey];
                    var opacidadeLegenda = (configAtual.opacidadePreenchimento !== undefined) ? configAtual.opacidadePreenchimento : 0.8;
                    
                    var textStyle = isHidden ? 'text-decoration: line-through; opacity: 0.5;' : '';
                    var iconStyle = getLegendIconStyle(cor, isHidden, opacidadeLegenda, configAtual);
                    
                    var nomeLegenda = configKey.charAt(0).toUpperCase() + configKey.slice(1); 
                    
                    legendContentHTML += '<div onclick="window.toggleLegendClass(\'' + configKey + '\')" style="display: flex; align-items: center; cursor: pointer; margin-bottom: 6px; transition: 0.2s; width: 100%; ' + textStyle + '" title="Clique para filtrar">' +
                                         '<i style="' + iconStyle + ' transition: 0.2s; flex-shrink: 0;"></i><span style="flex-grow: 1; text-align: left; margin-right: 10px;">' + nomeLegenda + '</span>' + 
                                         '</div>';
                }
            }
        });

        if (legendContentHTML !== '') {
            window.mapLegend = L.control({position: 'bottomleft'});
            window.mapLegend.onAdd = function (map) {
                var div = L.DomUtil.create('div', 'info legend');
                div.style.marginBottom = '80px'; 
                div.style.marginLeft = '20px';
                div.innerHTML = legendContentHTML;
                return div;
            };
            window.mapLegend.addTo(map);
        }
    }

    window.toggleLegendClass = function(classe) {
        if (window.hiddenClasses[classe]) {
            delete window.hiddenClasses[classe];
        } else {
            window.hiddenClasses[classe] = true;
        }

        if (currentChapterIndex >= 0 && overlays[currentChapterIndex]) {
            overlays[currentChapterIndex].forEach(function(layerObj) {
                if (layerObj.type === 'geojson' && layerObj.layerInstance && layerObj.layerInstance.customStyleFunc) {
                    layerObj.layerInstance.setStyle(layerObj.layerInstance.customStyleFunc);
                }
            });
        }
        
        updateCombinedLegend(currentChapterIndex);
    };

    var lastLat = startLat;
    var lastLon = startLon;
    var lastZoom = startZoom;

    // LOOP DADOS 
    data.forEach((row, i) => {
        if (row.Latitude && row.Latitude.trim() !== "") {
            lastLat = parseFloat(row.Latitude.replace(',', '.'));
            lastLon = parseFloat(row.Longitude.replace(',', '.'));
            lastZoom = parseFloat(row.Zoom) || 12;
        } 

        var lat = lastLat;
        var lon = lastLon;
        var zoomLevel = lastZoom;
        
        var sheetIconName = row.Pin || row.Icon || row.Icone || row['Ícone'];
        var marker = null; 

        if (sheetIconName && sheetIconName.trim() !== "") {
            var iconNameClean = sheetIconName.trim();
            var customIcon;
            
            if (typeof window[iconNameClean] !== 'undefined') {
                customIcon = window[iconNameClean];
            } else {
                var finalIconUrl = iconNameClean.includes('.') ? iconNameClean : iconNameClean + '.png';
                customIcon = L.icon({
                    iconUrl: 'media/' + finalIconUrl,
                    iconSize: [32, 32],                
                    iconAnchor: [16, 32],              
                });
            }

            marker = L.marker([lat, lon], { icon: customIcon, opacity: 1 });
            marker.addTo(map); 
            
            marker.on('click', function() {
                var chapterElement = document.getElementById('chapter-' + i);
                if (chapterElement) {
                    chapterElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
        }

        markers[i] = marker;

        var chapterExtras = [];
        var posicoesOcupadasPx = [];
        var chapterZoom = zoomLevel; 
        
        if (marker) {
            posicoesOcupadasPx.push(map.project([lat, lon], chapterZoom));
        }

        if (row['Extra Markers'] && row['Extra Markers'].trim() !== "") {
            var rawExtras = row['Extra Markers'].split(';'); 
            rawExtras.forEach(function(item) {
                var parts = item.split('|'); 
                
                if (parts.length >= 2) {
                    var latOriginal = parseFloat(parts[0].trim().replace(',', '.'));
                    var lonOriginal = parseFloat(parts[1].trim().replace(',', '.'));
                    
                    var ptPx = map.project([latOriginal, lonOriginal], chapterZoom);
                    var distanciaMinimaPx = 30; 
                    var sobreposto = true;
                    var angulo = 0;
                    var raioOffsetPx = 10; 
                    var tentativas = 0;

                    while (sobreposto && tentativas < 20) {
                        sobreposto = false;
                        for (var j = 0; j < posicoesOcupadasPx.length; j++) {
                            var ocupado = posicoesOcupadasPx[j];
                            var dx = ptPx.x - ocupado.x;
                            var dy = ptPx.y - ocupado.y;
                            var distPx = Math.sqrt(dx * dx + dy * dy);

                            if (distPx < distanciaMinimaPx) {
                                sobreposto = true;
                                ptPx.x += Math.cos(angulo) * raioOffsetPx;
                                ptPx.y += Math.sin(angulo) * raioOffsetPx;
                                angulo += Math.PI / 4; 
                                tentativas++;
                                break; 
                            }
                        }
                    }
                    
                    posicoesOcupadasPx.push({x: ptPx.x, y: ptPx.y});
                    var latLngAfastado = map.unproject(ptPx, chapterZoom);

                    var iconToUse = (typeof tedIcon !== 'undefined') ? tedIcon : ((typeof lageambIcon !== 'undefined') ? lageambIcon : new L.Icon.Default());
                    if (parts.length >= 4) {
                        var iconFile = parts[3].trim();
                        if (iconFile !== "") {
                            if (typeof window[iconFile] !== 'undefined') {
                                iconToUse = window[iconFile];
                            } else {
                                var finalIconUrl = iconFile.includes('.') ? iconFile : iconFile + '.png';
                                iconToUse = L.icon({
                                    iconUrl: 'media/' + finalIconUrl,
                                    iconSize: [32, 32], 
                                    iconAnchor: [16, 16],
                                    className: 'custom-extra-marker' 
                                });
                            }
                        }
                    }
                    
                    var extraMarker = L.marker([latLngAfastado.lat, latLngAfastado.lng], { icon: iconToUse, opacity: 1 });
                    
                    extraMarker.originalLatLng = L.latLng(latOriginal, lonOriginal);
                    extraMarker.offsetLatLng = latLngAfastado;
                    extraMarker.zoomBase = chapterZoom;

                    chapterExtras.push(extraMarker);
                }
            });
        }
        
        var chapterLayers = []; 
        if (row.Overlay && row.Overlay.trim() !== "") {
            var inputs = row.Overlay.split(',');
            var opacities = [];
            var configs = [];

            if (row['Overlay Transparency']) {
                opacities = row['Overlay Transparency'].toString().split(',');
            }

            var overlayConfigRaw = row['Overlay Config'] || row['Overlay config'];
            if (overlayConfigRaw) {
                configs = overlayConfigRaw.toString().split(',');
            }

            inputs.forEach(function(rawInput, idx) {
                var input = rawInput.trim();
                if (input === "") return;
                
                var currentOpacity = 0.8; 
                if (opacities[idx]) currentOpacity = parseFloat(opacities[idx].trim()) || 0.8;
                else if (opacities.length > 0) currentOpacity = parseFloat(opacities[0].trim()) || 0.8;

                var currentConfig = null;
                if (configs[idx]) currentConfig = configs[idx].trim();
                else if (configs.length > 0) currentConfig = configs[0].trim();

                var layerObj = null;
                var inputLower = input.toLowerCase(); 

                if (inputLower.endsWith('.geojson') || inputLower.endsWith('.json')) {
                    layerObj = { 
                        type: 'geojson', 
                        url: input, 
                        layerInstance: null, 
                        opacity: currentOpacity, 
                        configKey: currentConfig 
                    };
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
        
        overlays[i] = chapterLayers; 

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
            var mediaLinks = row['Media Link'].split(';').map(m => m.trim()).filter(m => m !== "");
            
            var audioLinks = mediaLinks.filter(m => m.toLowerCase().match(/\.(mp3|wav|ogg|m4a|aac)$/));
            var visualLinks = mediaLinks.filter(m => !m.toLowerCase().match(/\.(mp3|wav|ogg|m4a|aac)$/));

            var mediaHTML = "";
            var carouselId = 'carousel-' + i; 
            
            if (visualLinks.length > 1) {
                mediaHTML += `<div id="${carouselId}" class="custom-carousel-container" style="position: relative; width: 100%; border-radius: 5px; overflow: hidden; margin-bottom: 10px;">`;
            }
            
            visualLinks.forEach((m, vIndex) => {
                var mLower = m.toLowerCase();
                var displayStyle = vIndex === 0 ? 'block' : 'none';
                
                mediaHTML += `<div class="carousel-slide" style="display: ${displayStyle}; width: 100%; text-align: center;">`;
                
                if (mLower.includes('youtube') || mLower.includes('youtu.be')) {
                    var videoId = "";
                    if (m.includes('v=')) videoId = m.split('v=')[1].split('&')[0];
                    else if (m.includes('youtu.be/')) videoId = m.split('youtu.be/')[1].split('?')[0];
                    else if (m.includes('embed/')) videoId = m.split('embed/')[1].split('?')[0];

                    var embedUrl = videoId ? "https://www.youtube.com/embed/" + videoId : m;
                    mediaHTML += `<div class="video-container" style="max-width: 100%;"><iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe></div>`;
                } 
                else if (mLower.endsWith('.mp4') || mLower.endsWith('.webm') || mLower.endsWith('.mov')) {
                    mediaHTML += `<div class="video-container" style="padding-bottom: 0; height: auto; max-width: 100%;"><video controls controlsList="nodownload" style="width: 100%; border-radius: 5px;"><source src="${m}" type="video/mp4"></video></div>`;
                } 
                else {
                    mediaHTML += `<img src="${m}" alt="Mídia do Capítulo" style="width: 100%; max-height: 400px; object-fit: contain; border-radius: 5px;">`;
                }
                
                mediaHTML += `</div>`;
            });

            if (visualLinks.length > 1) {
                mediaHTML += `
                    <button onclick="window.mudaSlide('${carouselId}', -1)" style="position: absolute; top: 50%; left: 5px; transform: translateY(-50%); background-color: rgba(122, 178, 79, 0.85); color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">&#10094;</button>
                    <button onclick="window.mudaSlide('${carouselId}', 1)" style="position: absolute; top: 50%; right: 5px; transform: translateY(-50%); background-color: rgba(122, 178, 79, 0.85); color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">&#10095;</button>
                `;
                mediaHTML += `</div>`; 
                mediaHTML += `<div style="text-align: center; font-size: 13px; font-weight: bold; color: #7AB24F; margin-top: -5px; margin-bottom: 15px;" id="contador-${carouselId}">1 / ${visualLinks.length}</div>`;
            }

            audioLinks.forEach(m => {
                mediaHTML += `<div style="margin: 0; text-align: center;"><audio controls controlsList="nodownload"><source src="${m}" type="audio/mpeg"></audio></div>`;
            });

            if (row['Media Credit']) {
                mediaHTML += `<p class="caption">${row['Media Credit']}</p>`;
            } 

            content.innerHTML += mediaHTML;
        }
        if (row.Description) content.innerHTML += `<p>${row.Description}</p>`;
        container.appendChild(content);
        storyContainer.appendChild(container);

        chapters.push({ 
            id: chapterId, index: i, location: [lat, lon], zoom: zoomLevel, isHeader: false, extraMarkersData: chapterExtras 
        });
    });

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
                
                markers.forEach(m => { 
                    if (m && map.hasLayer(m)) map.removeLayer(m); 
                });
                extraMarkersGroup.clearLayers(); 
                overlays.forEach(chapterLayers => {
                    chapterLayers.forEach(obj => {
                        if (obj && obj.layerInstance && map.hasLayer(obj.layerInstance)) {
                            map.removeLayer(obj.layerInstance);
                        }
                    });
                });
                if (window.mapLegend) { map.removeControl(window.mapLegend); window.mapLegend = null; }

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

                var activeMarkerIdx = idx;

                markers.forEach((m, i) => {
                    if (m) {
                        if (i > activeMarkerIdx) {
                            if (map.hasLayer(m)) {
                                map.removeLayer(m);
                            }
                        } else {
                            if (!map.hasLayer(m)) {
                                m.addTo(map);
                            }
                            
                            const aplicarEfeitos = () => {
                                var el = m.getElement();
                                if (el) {
                                    el.style.transition = "opacity 0.5s ease, filter 0.5s ease";
                                    
                                    if (i === activeMarkerIdx) {
                                        m.setOpacity(1); 
                                        el.style.filter = "grayscale(0%)";
                                        m.setZIndexOffset(1000); 
                                    } else if (i < activeMarkerIdx) {
                                        m.setOpacity(0.35); 
                                        el.style.filter = "grayscale(100%)";
                                        m.setZIndexOffset(0); 
                                    }
                                }
                            };

                            if (m.getElement()) {
                                aplicarEfeitos();
                            } else {
                                m.once('add', function() {
                                    setTimeout(aplicarEfeitos, 10);
                                });
                            }
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
                            }
                        });
                    }
                });
                
                var currentLayers = overlays[idx];
                if (currentLayers && currentLayers.length > 0) {
                    var loadedGeojsonsCount = 0;
                    var totalGeojsons = currentLayers.filter(l => l.type === 'geojson').length;

                    if (totalGeojsons === 0 && window.mapLegend) {
                        map.removeControl(window.mapLegend);
                        window.mapLegend = null;
                    }

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
                                    
                                    var customStyle = function(feature) {
                                        var isLine = feature.geometry && (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString');
                                        
                                        var corPreenchimento = 'transparent'; 
                                        var corBordaFinal = '#477447'; 
                                        var valorFeicao = null;
                                        var configAtual = (typeof geojsonConfigs !== 'undefined' && currentOverlay.configKey) 
                                            ? geojsonConfigs[currentOverlay.configKey] 
                                            : null;

                                        if (configAtual && configAtual.cores) {
                                            if (typeof configAtual.cores === 'string') {
                                                corPreenchimento = configAtual.cores;
                                                corBordaFinal = configAtual.cores; 
                                                valorFeicao = currentOverlay.configKey; 
                                            } else {
                                                for (var coluna in feature.properties) {
                                                    var valor = feature.properties[coluna];
                                                    if (configAtual.cores[valor]) {
                                                        corPreenchimento = configAtual.cores[valor];
                                                        corBordaFinal = corPreenchimento;
                                                        valorFeicao = valor;
                                                        break;
                                                    }
                                                }
                                            }
                                        }

                                        if (configAtual && configAtual.corBorda !== undefined) {
                                            corBordaFinal = configAtual.corBorda;
                                        }

                                        if (valorFeicao && window.hiddenClasses && window.hiddenClasses[valorFeicao]) {
                                            return {
                                                stroke: false,
                                                fill: false,
                                                radius: 0,
                                                interactive: false 
                                            };
                                        }

                                        var fillOpac = (configAtual && configAtual.opacidadePreenchimento !== undefined) 
                                                        ? configAtual.opacidadePreenchimento 
                                                        : (currentOverlay.opacity || 0.8);
                                        
                                        var strokeOpac = (configAtual && configAtual.opacidadeBorda !== undefined) 
                                                        ? configAtual.opacidadeBorda 
                                                        : 0.8; 
                                                        
                                        var strokeWeig = (configAtual && configAtual.pesoBorda !== undefined) 
                                                        ? configAtual.pesoBorda 
                                                        : (isLine ? 3 : 1);   

                                        var tamanhoRaio = (configAtual && configAtual.tamanhoPonto !== undefined) 
                                        ? configAtual.tamanhoPonto 
                                        : 6;                 

                                        return { 
                                            stroke: true,                 
                                            fill: !isLine, 
                                            radius: tamanhoRaio,                    
                                            color: corBordaFinal,             
                                            fillColor: corPreenchimento,  
                                            weight: strokeWeig,                    
                                            opacity: strokeOpac,                   
                                            fillOpacity: fillOpac,
                                            interactive: true
                                        };
                                    };

                                    var geojsonOptions = {
                                        interactive: true,
                                        style: customStyle,
                                        pointToLayer: function (feature, latlng) {
                                            return L.circleMarker(latlng, customStyle(feature));
                                        },
                                        onEachFeature: function (feature, layer) {
                                            var configAtual = (typeof geojsonConfigs !== 'undefined' && currentOverlay.configKey) 
                                                ? geojsonConfigs[currentOverlay.configKey] 
                                                : null;

                                            function getAtributo(propriedades, nomeDesejado) {
                                                if (propriedades[nomeDesejado] !== undefined) return propriedades[nomeDesejado];
                                                var nomeBaixo = nomeDesejado.trim().toLowerCase();
                                                for (var chave in propriedades) {
                                                    if (chave.trim().toLowerCase() === nomeBaixo) return propriedades[chave];
                                                }
                                                return null; 
                                            }

                                            if (configAtual && configAtual.atributosTooltip && configAtual.atributosTooltip.length > 0) {
                                                var tooltipHTML = '<div style="font-family: Corbel, sans-serif; font-size: 13px; color: #333; text-align: center;">';
                                                var temTooltip = false;

                                                configAtual.atributosTooltip.forEach(function(coluna) {
                                                    var valor = getAtributo(feature.properties, coluna);
                                                    if (valor !== null && valor !== undefined && valor !== "") {
                                                        tooltipHTML += '<strong>' + valor + '</strong><br>';
                                                        temTooltip = true;
                                                    }
                                                });
                                                tooltipHTML += '</div>';

                                                if (temTooltip) {
                                                    layer.bindTooltip(tooltipHTML, { sticky: true, direction: 'auto', className: 'custom-tooltip' });
                                                }
                                            }
                                        }
                                    };

                                    if (vectorCache[currentOverlay.url]) {
                                        vectorCache[currentOverlay.url].then(data => {
                                            currentOverlay.layerInstance = L.geoJSON(data, geojsonOptions);
                                            currentOverlay.layerInstance.geojsonData = data; 
                                            currentOverlay.layerInstance.customStyleFunc = customStyle;

                                            if(currentChapterIndex === idx && showLayers) {
                                                currentOverlay.layerInstance.addTo(map);
                                                loadedGeojsonsCount++;
                                                if (loadedGeojsonsCount === totalGeojsons) {
                                                    updateCombinedLegend(idx);
                                                }

                                            }
                                        });
                                    } else {
                                        fetch(currentOverlay.url)
                                            .then(res => res.json())
                                            .then(data => {
                                                currentOverlay.layerInstance = L.geoJSON(data, geojsonOptions);
                                                currentOverlay.layerInstance.geojsonData = data; 
                                                currentOverlay.layerInstance.customStyleFunc = customStyle;

                                                if(currentChapterIndex === idx && showLayers) {
                                                    currentOverlay.layerInstance.addTo(map);
                                                    loadedGeojsonsCount++;
                                                    if (loadedGeojsonsCount === totalGeojsons) {
                                                        updateCombinedLegend(idx);
                                                    }
                                                }
                                            })
                                            .catch(err => console.error("Erro GeoJSON:", err));
                                    }
                                    return false; 
                                } else {
                                    if(currentChapterIndex === idx && showLayers) {
                                        loadedGeojsonsCount++;
                                        if (loadedGeojsonsCount === totalGeojsons) {
                                            updateCombinedLegend(idx);
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
                } else {
                    if (window.mapLegend) { map.removeControl(window.mapLegend); window.mapLegend = null; }
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

    window.mudaSlide = function(carouselId, direcao) {
    var container = document.getElementById(carouselId);
    if (!container) return;
    
    var slides = container.querySelectorAll('.carousel-slide');
    var totalSlides = slides.length;
    var indiceAtual = 0;
    
    for (var j = 0; j < totalSlides; j++) {
        if (slides[j].style.display === 'block') {
            indiceAtual = j;
            break;
        }
    }
    
    slides[indiceAtual].style.display = 'none';
    
    var novoIndice = indiceAtual + direcao;
    if (novoIndice >= totalSlides) novoIndice = 0;
    if (novoIndice < 0) novoIndice = totalSlides - 1;
    
    slides[novoIndice].style.display = 'block';
    
    var contador = document.getElementById('contador-' + carouselId);
    if (contador) {
        contador.innerText = (novoIndice + 1) + ' / ' + totalSlides;
    }
};

function parseGoogleSheetData(rows) {
    if (!rows || rows.length === 0) return [];
    var headers = rows[0];
    var data = [];
    for (var i = 1; i < rows.length; i++) {
        var row = rows[i]; var obj = {};
        for (var j = 0; j < headers.length; j++) { 
            var cleanHeader = headers[j] ? headers[j].trim() : "";
            obj[cleanHeader] = row[j] ? row[j] : ""; 
        }
        data.push(obj);
    }
    return data;
}