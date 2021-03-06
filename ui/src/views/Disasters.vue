<template>
<div>
    <TopMenu/>
    <div>
        <div id="map"/>
        <CountyDetail v-if="selected && geojson" :detail="selected" :fips="selectedFips" :layers="layers" :geojson="geojson"/>
        <div v-else style="position: relative;">
            <div class="page">
                <div style="padding-top: 10px; margin-bottom: 10px;">
                    <el-tabs v-model="mode" class="tabs">
                        <el-tab-pane name="dr" label="FEMA Disaster Declarations"></el-tab-pane>
                        <el-tab-pane name="eda" label="EDA Supplemental Awards"></el-tab-pane>
                        <el-tab-pane name="resilience" label="Disaster Resilience"></el-tab-pane>
                    </el-tabs>
                </div>

                <div class="map-description" v-if="mode">
                    <p v-if="mode == 'dr'">
                        This map shows counties with FEMA declared disasters within specified time range. Please visit <a href="https://www.fema.gov/disasters/disaster-declarations">FEMA Disasters</a> page for more detail.
                    </p>
                    <p v-if="mode == 'eda'">
                        This map shows locations and amounts of EDA (U.S. Economic Development Administration) fundings awarded in the specified time range. EDA assists communities experiencing economic distress or harm resulting from federally-declared natural disasters.
                    </p>
                    <p v-if="mode == 'resilience'">
                        This map shows disaster resilience score for each counties in the specified year aggregated into 4 major categories (Social, Economic, Infrastructure, and Community Capital). 
                        Disaster resilience measures the capacity of a community to recover from disaster events without losing their socioeconomic and infrastructural viability [Combaz, 2015] [UNISDR, 2005].
                        The scores are calculated using data from U.S. Census using formulas defined by [Cuter et al. 2020]. Please click/select a county to show measures for each county under "Disaster Resilience" section, and formula used to compute the score are shown under "Show Detail" button.
                    </p>
                </div>
                
                <div class="legend" v-if="mode == 'dr'">
                    <p>
                        <b>Date Range</b>
                        <el-row :gutter="5">
                            <el-col :span="4">
                                 <el-button icon="el-icon-back" size="mini" @click="drPrevious" :disabled="drRange == '1961'"></el-button>
                            </el-col>
                            <el-col :span="16">
                                <el-select v-model="drRange" placeholder="Select" size="mini">
                                    <el-option v-for="item in drRanges" :key="item.value" :label="item.label" :value="item.value"/>
                                </el-select>
                            </el-col>
                            <el-col :span="4">
                                 <el-button icon="el-icon-right" size="mini" @click="drNext" :disabled="drRange == 'recent'"></el-button>
                            </el-col>
                        </el-row>
                    </p>
                    <p>
                        <b>Disaster Types</b>
                    </p>
                    <div class="legend-item" style="border-bottom: 1px solid #0002; margin-bottom: 8px; padding-bottom: 3px;">
                        <input type="checkbox" v-model="layersAll" @change="handleAll"/>
                        All
                    </div>
                    <div v-for="(info, layer) in layers" :key="layer" class="legend-item" :class="{hidden: hiddenLayers.includes(layer)}" @click.stop="toggleLayer(layer)" style="clear: both;" :title="info.types.join(', ')">
                        <input type="checkbox" :checked="!hiddenLayers.includes(layer)"/>
                        <span class="legend-color" :style="{backgroundColor: info.color}">&nbsp;</span>&nbsp;{{layer}}
                    </div>
                    <!--
                    <span class="legend-eda"/> EDA Award ($)
                    -->
                </div>
                <div class="legend" v-if="mode == 'resilience'">
                    <p>
                        <b>Year</b>
                        <el-row :gutter="5">
                            <el-col :span="4">
                                 <el-button icon="el-icon-back" size="mini" @click="resPrevious" :disabled="resYear == '2012'"></el-button>
                            </el-col>
                            <el-col :span="16">
                                <el-select v-model="resYear" placeholder="Select" size="mini">
                                    <el-option v-for="item in resYears" :key="item.value" :label="item.label" :value="item.value"> </el-option>
                                </el-select>
                            </el-col>
                            <el-col :span="4">
                                 <el-button icon="el-icon-right" size="mini" @click="resNext" :disabled="resYear == '2018'"></el-button>
                            </el-col>
                        </el-row>
                    </p>
                    <p>
                        <b>Resiliences</b>
                    </p>
                    <div v-for="(info, cid) in cutterIndicators" :key="cid" class="legend-item">
                        <el-radio v-model="drLayer" :label="cid" @change="showDRLayers" :style="{color: info.color}">{{info.name}}</el-radio>
                    </div>
                    <br>
                    <div style="background-image: linear-gradient(to right, red, yellow, green); width: 100%; height: 5px;">&nbsp;</div>
                    <span style="float: left;">Low</span>
                    <span style="float: right">High</span>
                </div>
                <div class="legend" v-if="mode == 'eda'">
                    <!--
                    <p>
                        <b>EDA2018 Awards</b>
                    </p>
                    -->
                    <p>
                        <b>Year</b>
                        <!--
                        <el-select v-model="edaYear" placeholder="Select" size="mini">
                            <el-option v-for="item in edaYears" :key="item.value" :label="item.label" :value="item.value"> </el-option>
                        </el-select>
                        -->
                        <el-row :gutter="5">
                            <el-col :span="4">
                                 <el-button icon="el-icon-back" size="mini" @click="edaPrevious" :disabled="edaYear == '2012'"></el-button>
                            </el-col>
                            <el-col :span="16">
                                <el-select v-model="edaYear" placeholder="Select" size="mini">
                                    <el-option v-for="item in edaYears" :key="item.value" :label="item.label" :value="item.value"> </el-option>
                                </el-select>
                            </el-col>
                            <el-col :span="4">
                                 <el-button icon="el-icon-right" size="mini" @click="edaNext" :disabled="edaYear == '2020' || edaYear == 'all'"></el-button>
                            </el-col>
                        </el-row>
                    </p>
                    <div class="legend-item">
                        <span class="legend-color" style="background-color: #00ff00">&nbsp;</span>&nbsp;Statewide Awards
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background-color: #0066ff">&nbsp;</span>&nbsp;County Awards
                    </div>
                </div>
                <div class="county-selecter">
                    <CountySelecter style="width: 210px" @selected="countySelected" :options="countyList"/>
                </div>

            </div>

            <!--
            <footer>
                <div class="page">
                    <p style="line-height: 200%; margin-top: 5px;">
                        This platform brings data science to decision-makers dealing with the economics of 
                        disaster mitigation, analysis, and recovery activities.
                        Made by <b>CTIL Crisis Technologies Innovation Lab</b> at Indiana University
                    </p>
                </div>
            </footer>
            -->
        </div>
    </div>
    <div class="tutorial">
        <div class="tutorial-text tutorial-text-tab" @click="showTutorial('legend')">
            <i class="el-icon-top" style="font-size: 150%; font-weight: bold;"/>
            <p style="margin: 0 40px 0 0 0;">
                Welcome to APRED! Let us quickly introduce you to our platform.<br> 
                Here you can switch tabs to show different information layers.
                <br>
                <br>
                <el-button type="primary" size="small">Next</el-button>
            </p>
        </div> 
        <div class="tutorial-text tutorial-text-legend" @click="showTutorial('county')">
            <i class="el-icon-right" style="float: right; font-size: 150%;"></i>
            <p style="margin: 0 0 0 40px;">
                Select date range, and various other options for each information layers.
                <br>
                <br>
                <el-button type="primary" size="small">Next</el-button>
            </p>
        </div> 
        <div class="tutorial-text tutorial-text-county" @click="showTutorial()">
            <i class="el-icon-right" style="float: right; font-size: 150%;"></i>
            <p style="margin: 0 40px 0 0 0;">
                Here, you can search and select a county to show the county detail. You can also click a county on the map.
                <br>
                <br>
                <el-button type="primary" size="small">Done!</el-button>
            </p>
        </div> 
    </div>
    <div class="contextmenu" ref="contextmenu">
        <p class="menu-item" @click="openContextMenuCounty">Open this county ({{contextMenuCounty}}) in a new tab</p>
    </div>
</div>
</template>

<script>

import { Component, Vue, Watch } from 'vue-property-decorator'

import CountySelecter from '@/components/CountySelecter.vue'
import TopMenu from '@/components/TopMenu.vue'
import CountyDetail from '@/components/CountyDetail.vue'
import Footer from '@/components/Footer.vue'

import mapboxgl from 'mapbox-gl';
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = "pk.eyJ1Ijoic29pY2hpaCIsImEiOiJjazVqdnBsM2cwN242M2psdjAwZXhhaTFuIn0.o3koWlzx1Tup8CJ1B_KaEA";

@Component({
    components: { CountySelecter, TopMenu, CountyDetail, Footer },
})
export default class Disaster extends Vue {

    popup;
    selected = null;
    selectedFips = null;
    geojson = null;

    cutters = null;

    hiddenLayers = ["biological"];
    drLayer = "SOC";
    //hiddenDRLayers = [];
    countyList = [];
    layersAll = true;

    contextMenuCounty = null;

    updatedDate = null;

    mode = null; //will be init to "dr" once we are ready to show dr map

    drRange = null;
    drRanges = [
        {value: 'recent', label: '2017 - Now'},
    ];
    yearsDR = null;

    resYear = null; //will be set to "2018" once cutter info is loaded
    resYears = [];

    edaYear = 'all';
    edaYears = [];

    cutterIndicators = {
        "SOC": {
            name: "Social",
            color: "#444",
        },
        "ECON": {
            name: "Economic",
            color: "#444",
        },
        "IHFR": {
            name: "Infrastructure",
            color: "#444",
        },
        "COMM": {
            name: "Community Capital",
            color: "#444",
        },
    }

    layers = {
        "biological": {
            color: "#396",
            opacity: 0.5,
            types: ["Biological"],
        },
        "other": {
            color: "#999",
            types: ["EarthQuake", "Coastal Storm", "Snow", "Mud/Landslide", "Volcano", "Dam/Levee Break", "Severe Ice Storm"],
        }, 
        "hurricane": {
            color: "#0af", 
            types: ["Hurricane"],
        },
        "tornado": {
            color: "#f6f", 
            types: ["Tornado"],
        },
        "severe storm": { 
            color: "#fa0", 
            types: ["Severe Storm(s)"],
        },
        "flood": {
            color: "#06f",
            types: ["Flood"],
        },
        "fire": {
            color: "#f00", 
            types: ["Fire"],
        },
    };

    @Watch('$route')
    onRouteChange() {
        this.loadCounty(this.$route.params.fips);
    }

    @Watch('drRange')
    onRangeChange() {
        //apply to each layers
        for(const key in this.layers) {
            const types = this.layers[key].types;
            if(!types) continue;
            let filter = ['in', 'fips'];
            let stateFilter = ['in', 'statefips'];
            const years = [];
            if(this.drRange == "recent") {
                const now = new Date();
                for(let y = 2017; y <= now.getFullYear(); ++y) years.push(y);
            } else years.push(this.drRange);

            years.forEach(year=>{ 
                types.forEach(type=>{
                    if(this.yearsDR[year][type]) {
                        filter = filter.concat(this.yearsDR[year][type].filter(fip=>fip.length == 5));
                        stateFilter = stateFilter.concat(this.yearsDR[year][type].filter(fip=>fip.length == 2));
                    }
                }); 
            });
            this.map.setFilter('county_disaster_'+key, filter);
            this.map.setFilter('state_disaster_'+key, stateFilter);
        }
    }

    @Watch('resYear')
    onResChange(v) {
        if(!v) return;
        const year = parseInt(this.resYear);
        for(const cid in this.cutterIndicators) {
            //load specified year / cutter measure
            const values = {};
            for(const fip in this.cutters) {
                const cutter = this.cutters[fip];
                if(cutter[cid]) values[fip] = cutter[cid][year-2012];
            }   

            //apply to geojson 
            this.geojson.features.forEach(feature=>{
                const fips = feature.properties["statefips"]+"."+feature.properties["countyfips"];
                feature.properties["resilience"] = values[fips]||0;
            });

            this.map.getSource('dr'+cid).setData(this.geojson);
        }
    }
    
    @Watch('edaYear')
    onEdaYearChange(v) {
        if(!v) return;
        if(this.edaYear == "all") {
            this.map.setFilter('eda', null); //reset filter
            return;
        }
        const startDate = new Date(this.edaYear+"-01-01").getTime();
        const endDate = new Date(this.edaYear+"-12-31").getTime();
        this.map.setFilter('eda', [
            "all",     
            [">=", ['get', 'date'], startDate],
            ["<=", ['get', 'date'], endDate]
        ]);
    }
 
    created() {
        const h = window.localStorage.getItem("hiddenLayers");
        if(h) {
            this.hiddenLayers = JSON.parse(h);
            this.layersAll = (this.hiddenLayers.length == 0);
        }

        const drLayer = window.localStorage.getItem("drLayer");
        if(drLayer) this.drLayer = drLayer;

        for(let year = 2020; year > 1960; --year) {
            this.drRanges.push(
                {value: year.toString(), label: year.toString()},
            );
        }
        for(let year = 2018; year >= 2012; --year) {
            this.resYears.push(
                {value: year.toString(), label: year.toString()},
            );
        }
        this.edaYears.push({value: 'all', label: 'All'});
        for(let year = 2020; year >= 2012; --year) {
            this.edaYears.push({value: year.toString(), label: year.toString()});
        }
    }

    @Watch('mode')
    onModeChange(v) {
        if(!v) return;
        if(v == 0) return; //where does this come from?

        this.hideDDLayers();
        this.hideDRLayers();
        this.hideEDA2018Layers();

        //show layers that belongs to mode
        switch(this.mode) {
        case "dr":
            this.showDDLayers();
            break;
        case "resilience":
            this.showDRLayers();
            break;
        case "eda":
            this.showEDA2018Layers();
            break;
        }
    }

    hideDDLayers() {
        for(const t in this.layers) {
            this.map.setLayoutProperty('county_disaster_'+t, 'visibility', 'none');
            this.map.setLayoutProperty('state_disaster_'+t, 'visibility', 'none');
        }
    }

    showDDLayers() {
        for(const t in this.layers) {
            this.map.setLayoutProperty('county_disaster_'+t, 'visibility', this.hiddenLayers.includes(t)?'none':'visible');
            this.map.setLayoutProperty('state_disaster_'+t, 'visibility', this.hiddenLayers.includes(t)?'none':'visible');
        }
    }

    hideDRLayers() {
        if(!this.cutters) return; //DR not yet loaded
        for(const t in this.cutterIndicators) {
            this.map.setLayoutProperty('dr'+t, 'visibility', 'none');
        }
    }

    showDRLayers() {
        for(const t in this.cutterIndicators) {
            this.map.setLayoutProperty('dr'+t, 'visibility', this.drLayer==t?'visible':'none');
        }
    }
    hideEDA2018Layers() {
        this.map.setLayoutProperty('eda-labels', 'visibility', 'none');
        this.map.setLayoutProperty('eda', 'visibility', 'none');
    }

    showEDA2018Layers() {
        this.map.setLayoutProperty('eda-labels', 'visibility', 'visible');
        this.map.setLayoutProperty('eda', 'visibility', 'visible');
    }

    loadCutters(year, measure) {
        //create source / layer
        this.map.addSource('dr'+measure, { type: "geojson", data: this.geojson });
        this.map.addLayer({
            "id": "dr"+measure,
            "type": "fill",
            "source": "dr"+measure,
            "paint": {
                //"fill-opacity": ['get', 'resilience'],
                //"fill-color": this.cutterIndicators[measure].color,
                'fill-color': [
                    'interpolate',
                    ['linear'],
                    [ "get", "resilience" ],
                    0,
                    'red',
                    0.5,
                    'yellow',
                    1,
                    'green'
                ]
            },
            layout: {
                visibility: 'none',
            }
        }, 'counties');

        this.resYear = '2018';
    }

    mounted() {
        this.loadCounty(this.$route.params.fips);

        this.map = new mapboxgl.Map({
            container: 'map', // HTML container id
            style: 'mapbox://styles/mapbox/light-v10', // style URL
            center: [-100, 41.5], // starting position as [lng, lat]
            minZoom: 2,
            pitch: 30, // pitch in degrees
            //bearing: 10, // bearing in degrees
            zoom: 1,
        });

        // disable map zoom when using scroll
        //this.map.scrollZoom.disable();

        // Add zoom and rotation controls to the map.
        this.map.addControl(new mapboxgl.NavigationControl());

        this.popup = new mapboxgl.Popup({
            closeButton: false,
            offset: [0, -20],
        });

        this.map.on('load', ()=>{

            //TODO - allow user to specify this year to show for dr

            //I can try..
            //this.map.getSource('counties').setData(new_geojson); 
            //or maybe better to somehow update the prop values on the fly? can I do that?

            //TODO - I should separate DR information from counties_geo.. so we can load data for each year ranges
            //counties_geo should just contain counties_geo
            fetch(this.$root.dataUrl+"/counties_geo.json").then(res=>{ 
                this.updatedDate = res.headers.get("last-modified")
                return res.json()
            }).then(data=>{
                this.geojson = data;

                data.features.forEach(feature=>{
                    const props = feature.properties;
                    if(props.countyfips) {
                        this.countyList.push({value: props.statefips+props.countyfips, label: props.county+", "+props.state});
                    }

                });

                //all counties
                this.map.addSource('counties', { type: "geojson", data });
                this.map.addLayer({
                    "id": "counties",
                    "type": "fill",
                    "source": "counties",
                    "paint": {
                        //"fill-outline-color": "rgba(0,0,0.5,0.1)",
                        "fill-color": "rgba(0,0,0,0.1)"
                    }
                });

                for(const t in this.layers) {
                    const layer = this.layers[t];

                    this.map.addLayer({
                        id: 'county_disaster_'+t,
                        type: 'fill',
                        source: 'counties',
                        paint: {
                            'fill-color': layer.color,
                            'fill-opacity': (layer.opacity||1)*0.75
                        },
                        //filter: layer.filter,
                        filter: ['in', 'fips', ''],
                        layout: {
                            visibility: 'none',
                        }
                    }, 'counties');

                    this.map.addLayer({
                        'id': 'state_disaster_'+t,
                        'type': 'fill',
                        'source': 'counties',
                        'paint': {
                            'fill-color': layer.color,
                            'fill-opacity': (layer.opacity||1)*0.2,
                        },
                        //'filter': layer.statefilter,
                        filter: ['in', 'statefips', ''],
                        layout: {
                            visibility: 'none',
                        }
                    }, 'counties');
                }

                fetch(this.$root.dataUrl+"/years.json").then(res=>{ 
                    //this.drYearsUpdated = res.headers.get("last-modified")
                    return res.json()
                }).then(data=>{
                    this.yearsDR = data;
                    this.drRange = "recent";

                    //ready to show DR map now
                    this.mode = "dr";
                });

                fetch(this.$root.dataUrl+"/cutter_long.json").then(res=>{ 
                    return res.json()
                }).then(data=>{
                    this.cutters = data;
                    for(const cid in this.cutterIndicators) {
                        this.loadCutters(2018, cid);
                    }
                });
            });

            fetch(this.$root.dataUrl+"/eda2018.json").then(res=>{ 
                return res.json()
            }).then(data=>{
                const geojson = {type: "FeatureCollection", features: []};
                for(const recid in data) {
                    const rec = data[recid];
                    const ep = 0.15;
                    geojson.features.push({
                        type: "Feature",
                        geometry: {
                            type: "Polygon",
                            coordinates: [ 
                            [    [ rec.lon-ep, rec.lat-ep ],
                                [ rec.lon-ep, rec.lat+ep ],
                                [ rec.lon+ep, rec.lat+ep ],
                                [ rec.lon+ep, rec.lat-ep ],
                                [ rec.lon-ep, rec.lat-ep ], ]
                            ]
                        },
                        properties: {
                            height: rec.award_amount/20,
                            //awardStr: "$"+this.$options.filters.formatNumber(rec.award_amount/1000)+"k",
                            date: new Date(rec.grant_award_date).getTime(),
                            color: rec.statewide?'#00ff00':'#0066ff',
                        }
                    });
                }
                /*
                const startDate = new Date("2019-01-01").getTime();
                const endDate = new Date("2020-01-01").getTime();
                */
                this.map.addSource('eda', { type: "geojson", data: geojson });
                this.map.addLayer({
                    'id': 'eda',
                    'type': 'fill-extrusion',
                    "source": "eda",
                    "paint": {
                        "fill-extrusion-color": ['get', 'color'],
                        "fill-extrusion-height": ['get', 'height'],
                    },
                    /*
                    filter: [
                         "all",     
                        [">=", ['get', 'date'], startDate],
                        ["<=", ['get', 'date'], endDate]
                    ],
                    */
                    layout: {
                        visibility: 'none', 
                    }
                });

                const geojsonPoint = {type: "FeatureCollection", features: []};
                for(const recid in data) {
                    const rec = data[recid];
                    geojsonPoint.features.push({
                        type: "Feature",
                        geometry: {
                            type: "Point",
                            coordinates: [ rec.lon, rec.lat ],
                        },
                        properties: {
                            //award: rec.award_amount,
                            awardStr: "$"+this.$options.filters.formatNumber(rec.award_amount/1000)+"k",
                            type: rec.statewide?'state':'county',
                        }
                    });
                }
                this.map.addSource('eda-point', { type: "geojson", data: geojsonPoint });

                this.map.addLayer({
                    'id': 'eda-labels',
                    'type': 'symbol',
                    "source": "eda-point",
                    layout: {
                        visibility: 'none', 
                        'text-field': ['get', 'awardStr'],
                        'text-size': [
                            "interpolate", 
                            [ "linear" ],
                            [ "zoom" ], 
                            2,
                            [ "interpolate", [ "linear" ], [ "get", "award" ], 500, 3, 5000, 6 ],
                            9,
                            [ "interpolate", [ "linear" ], [ "get", "award" ], 500, 10, 5000, 30 ]
                        ]
                    },
                    'paint': {
                        'text-color': 'rgba(0,0,0,1)'
                        //'text-color': 'rgba(255,255,255,1)'
                    }
                });

            });

            this.map.on('click', e=>{
                const features = this.map.queryRenderedFeatures(e.point, {
                    layers: ['counties']
                });
                if(features.length > 0) {
                    this.countySelected(features[0].properties.statefips+features[0].properties.countyfips);
                }
            });
            this.map.on('contextmenu', e=>{
                const features = this.map.queryRenderedFeatures(e.point, {
                    layers: ['counties']
                });
                if(features.length > 0) {
                    e.preventDefault();
                    const mapel = document.getElementById("map");
                    this.$refs["contextmenu"].style.display = "block";
                    this.$refs["contextmenu"].style.left = (e.point.x-20)+"px";
                    this.$refs["contextmenu"].style.top = (mapel.offsetTop + e.point.y - 10)+"px";
                    this.contextMenuCounty = features[0].properties.statefips+features[0].properties.countyfips;
                }
            });

            //close context menu as soon as user leaves it
            this.$refs["contextmenu"].addEventListener("mouseleave", ()=>{
                this.$refs["contextmenu"].style.display = "none";
            });

            this.map.on('mousemove', 'counties', (e)=> {
                // Change the cursor style as a UI indicator.
                this.map.getCanvas().style.cursor = 'pointer';
                
                // Single out the first found feature.
                const feature = e.features[0];
                
                // Display a popup with the name of the county
                let text = feature.properties.county+", "+feature.properties.state;
                for(const key in feature.properties) {
                    if(key.startsWith("is")) {
                        text += " | "+key.substring(2);
                    }
                }

                this.popup.setLngLat(e.lngLat).setText(text).addTo(this.map);
            });

            this.map.on('mouseleave', 'counties', ()=>{
                this.popup.remove();
            });

            this.map.on('idle', ()=>{
                const tutorialPlayed = localStorage.getItem("tutorial-played");
                if(!tutorialPlayed && !this.selected && window.innerWidth > 800) {
                    localStorage.setItem("tutorial-played", new Date());

                    //need to reset display from default(none) to block for smooth animation initially
                    const tutorial = document.getElementsByClassName("tutorial")[0];
                    tutorial.style.display = "block";
                    this.$nextTick(()=>{
                        this.showTutorial('tab');
                    });
                }
            });
        })
    }

    showTutorial(page) {

        const tutorial = document.getElementsByClassName("tutorial")[0];

        //close previously opened tutorial
        let item = document.getElementsByClassName("tutorial-focus")[0];
        if(item) item.classList.remove("tutorial-focus");
        let text = document.getElementsByClassName("tutorial-text-show")[0];
        if(text) text.classList.remove("tutorial-text-show");

        switch(page) {
        case "tab":
            item = document.getElementsByClassName("tabs")[0];
            text = document.getElementsByClassName("tutorial-text-tab")[0];
            text.style["top"] = (item.offsetTop + 110)+"px";
            text.style["left"] = (item.offsetLeft + 20)+"px";
            break;
        case "legend":
            item = document.getElementsByClassName("legend")[0];
            text = document.getElementsByClassName("tutorial-text-legend")[0];
            text.style["top"] = (item.offsetTop + 60)+"px";
            text.style["left"] = (item.offsetLeft - 420)+"px";
            break;
        case "county":
            item = document.getElementsByClassName("county-selecter")[0];
            text = document.getElementsByClassName("tutorial-text-county")[0];
            text.style["top"] = (item.offsetTop + 50)+"px";
            text.style["left"] = (item.offsetLeft - 420)+"px";
            break;
        default:
            tutorial.classList.remove("tutorial-active");
            tutorial.style.opacity = "0";
            setTimeout(()=>{
                tutorial.style.display = "none";
            }, 1000);
            return;
        }

        //activate tutorial
        tutorial.classList.add("tutorial-active");
        item.classList.add("tutorial-focus");
        text.classList.add("tutorial-text-show");
    }

    loadCounty(fips) {
        if(!fips) {
            this.selected = null;
            this.selectedFips = null;
            this.$ga.page('/map')
            return;
        }
        this.$ga.page('/county/'+fips)

        this.showTutorial(); //hiding tutorial

        const loading = this.$loading({
            lock: true,
            text: 'Loading',
            spinner: 'el-icon-loading',
            background: 'rgba(255, 255, 255, 0.3)'
        });
        fetch(this.$root.dataUrl+"/counties/county."+fips+".json").then(res=>res.json()).then(data=>{
            if(data.cutter) {
                delete data.cutter.INST;
                delete data.cutter.FLOR;
            }
            this.selected = data;
            this.selectedFips = fips;
            loading.close();
        });
    }

    countySelected(fips) {
        this.$router.push('/county/'+fips);
    }
    openContextMenuCounty() {
        window.open("#/county/"+this.contextMenuCounty, "apred-"+this.contextMenuCounty);
    }

    toggleLayer(layer) {
        const pos = this.hiddenLayers.indexOf(layer);
        if(~pos) this.hiddenLayers.splice(pos, 1);
        else this.hiddenLayers.push(layer);
        this.map.setLayoutProperty('county_disaster_'+layer, 'visibility', this.hiddenLayers.includes(layer)?'none':'visible');
        this.map.setLayoutProperty('state_disaster_'+layer, 'visibility', this.hiddenLayers.includes(layer)?'none':'visible');
        this.layersAll = (this.hiddenLayers.length == 0);

        window.localStorage.setItem("hiddenLayers", JSON.stringify(this.hiddenLayers));
    }

    handleAll() {
        if(this.layersAll) {
            this.hiddenLayers = [];
        } else {
            this.hiddenLayers = [];
            for(const key in this.layers) {
                this.hiddenLayers.push(key);
            }
        }
        window.localStorage.setItem("hiddenLayers", JSON.stringify(this.hiddenLayers));

        //apply layer state
        for(const layer in this.layers) {
            this.map.setLayoutProperty('county_disaster_'+layer, 'visibility', this.hiddenLayers.includes(layer)?'none':'visible');
            this.map.setLayoutProperty('state_disaster_'+layer, 'visibility', this.hiddenLayers.includes(layer)?'none':'visible');
        }
    }

    resPrevious() {
        this.resYear = (parseInt(this.resYear)-1).toString();
    }

    resNext() {
        this.resYear = (parseInt(this.resYear)+1).toString();
    }

    edaPrevious() {
        if(this.edaYear == "all") {
            this.edaYear = "2020";
            return;
        }
        this.edaYear = (parseInt(this.edaYear)-1).toString();
    }

    edaNext() {
        this.edaYear = (parseInt(this.edaYear)+1).toString();
    }

    findIndexDrRange(range) {
        let idx = null;
        this.drRanges.forEach((i, _idx)=>{
            if(i.value == range) idx = _idx;
        });
        return idx;
    }

    drPrevious() {
        const idx = this.findIndexDrRange(this.drRange);
        this.drRange = this.drRanges[idx+1].value;
    }

    drNext() {
        const idx = this.findIndexDrRange(this.drRange);
        this.drRange = this.drRanges[idx-1].value;
    }
}
</script>
<style lang="scss" scoped> 
p {
    margin-top: 0px;
    line-height: 150%;
    color: #666;
}
h2 {
    font-size: 15pt;
    padding: 20px 0;
    color: #0006;
    text-transform: uppercase;
}

h3 {
    padding: 20px 0 0px 0;
    color: #0006;
    text-transform: uppercase;
}

h4 {
    opacity: 0.7;
}

#map {
    position: fixed;
    width: 100%;
    top: 100px;
    bottom: 0;
}

.map-overlay {
    background-color: #fff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    border-radius: 3px;
    position: absolute;
    width: 25%;
    top: 10px;
    left: 10px;
    padding: 10px;
    display: none;
}
.sub-heading {
    opacity: 0.8;
    font-weight: bold;
    font-size: 90%;
    color: black;
}
.primary {
    font-weight: bold;
    font-size: 175%;
    color: #409EFF;
}
.legend {
    background-color: #fffc;
    padding: 10px;
    text-transform: uppercase;
    font-size: 80%;
    border-radius: 5px;
    margin-right: 40px;
    
    float: right;
    z-index: 1; 
    position: relative; 
    width: 190px;

    .legend-color {
        display: inline-block;
        width: 10px;
        height: 10px;
    }

    .legend-eda {
        display: inline-block;
        width: 8px;
        height: 8px;   
        border-radius: 50%;
        border: 2px solid #67c23a;
    }

    .legend-item {
        width: 190px;
        height: 20px;
        margin-right: 10px;
        cursor: pointer;
        &.hidden {
            color: #999;
        }
        input[type='checkbox'] {
            float: right;
            position: relative;
            height: 15px;
            top: -5px;
        }
    }    
}

.map-description {
    position: relative;
    opacity: 0.8;
    background-color: #fff;
    float: left;
    width: calc(100% - 300px);
    padding: 10px;
    border-radius: 5px;
    font-size: 90%;
    p {
        margin-bottom: 0;
    }
}

.county-selecter {
    float: right; 
    z-index: 1; 
    margin-right: 40px;
    position: relative; 
    clear: right;
    margin-top: 20px;
}

@media (max-width: 600px) {
    .county-selecter {
        display: none;
    }
    .map-description {
        display: none;
    }
}
.tutorial {
    display: none;
    opacity: 0;
    position: fixed;
    background-color: #0009;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    z-index: 2;
    transition: opacity 1s;

    &.tutorial-active {
        opacity: 1;
    }
    .tutorial-text {
        position: fixed;
        width: 400px;
        color: white;
        opacity: 0;
        transition: opacity 1s;
        font-size: 110%;
        p { 
            color: white;
        }

        &.tutorial-text-show {
            opacity: 1;
        }
    }
}

.tutorial-focus {
    position: relative;
    z-index: 3;
    transition: box-shadow 1s;
    box-shadow: 0 0 20px black;
}
.el-button--mini {
    padding: 7px;
}
.legend-colorbox {
    height: 10px;
    width: 10px;
    background-color: gray;
    display: inline-block;
}
</style>
