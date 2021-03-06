<template>
<div>
    <svg viewBox="0 0 1000 270" height="150px" width="450px">
        <!--grid lines-->
        <g>
            <line v-for="(year, idx) in years" :key="year" :x1="itox(idx)" y1="20" :x2="itox(idx)" :y2="ptoy(ymin)" style="stroke:rgb(175,175,175);stroke-width:0.5" /> 
            <line v-for="(y, idx) in yticks" :key="idx" :x1="120" :y1="ptoy(y)" :x2="1000" :y2="ptoy(y)" style="stroke:rgb(175, 175, 175);stroke-width: 0.5"/>
        </g>

        <!--x axis / ticks-->
        <g>
            <line :x1="120" :y1="ptoy(ymin)" :x2="1000" :y2="ptoy(ymin)" style="stroke:rgb(100,100,100);" /> 
            <text v-for="(year, idx) in years" :key="year" :x="itox(idx)"  text-anchor="middle" :y="height" class="ticks">{{year}}</text>
        </g>

        <!--y axix / ticks-->
        <g>
            <line x1="120" :y1="ptoy(ymin)" x2="120" :y2="ptoy(ymax)" style="stroke:rgb(100,100,100);" /> 
            <text v-for="(y, idx) in yticks" :key="idx" :x="100" :y="ptoy(y)+8" text-anchor="end" class="ticks">{{(y*100).toFixed(fixed)}} %</text>
        </g>

        <!-- us avg/sdev-->
        <g>
            <path :d="sdevPath(cutters.us.avg, cutters.us.sdev, lineCommand)" fill="#0002" stroke="none"/>
            <path :d="svgPath(cutters.us.avg, lineCommand)" fill="none" stroke="#0005" stroke-width="2"/>
        </g>

        <!-- state avg/sdev-->
        <g>
            <path :d="sdevPath(cutters.states.avg, cutters.states.sdev, lineCommand)" fill="#09f4" stroke="none"/>
            <path :d="svgPath(cutters.states.avg, lineCommand)" fill="none" stroke="#09f8" stroke-width="2"/>
        </g>

        <!-- county-->
        <g>
            <path :d="svgPath(cutters.county, lineCommand)" fill="none" stroke="#409EFF" stroke-width="3"/>
            <g v-for="(p, idx) in cutters.county" :key="idx" class="with-tooltip">
                <circle :cx="itox(idx)" :cy="ptoy(p)" r="10" stroke="#409EFF" stroke-width="4" fill="white"/>
                <text :x="itox(idx)" :y="ptoy(p)-30" text-anchor="middle" class="tooltip">{{(p*100).toFixed(fixed+1)}}%</text>
            </g>
        </g>
    </svg>
</div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class CompositePlot extends Vue {

    height = 300;
    ymax: (number|null) = null;
    ymin: (number|null) = null;
    fixed = 0;

    years: number[] = [];

    @Prop() readonly edaAwards: any;
    @Prop() readonly cutters: any;

    constructor() {
        super();

        for(let year = 2012; year <= 2018; ++year) {
            this.years.push(year);
        }

        //find ymin/max
        const findMinMax = (vs: number[], sdevs?: number[])=>{
            vs.forEach((v, index)=>{
                if(v == null) return;
                let vmin = v;
                let vmax = v;
                if(sdevs) {
                    vmin -= sdevs[index];
                    vmax += sdevs[index];
                }
                if(this.ymin === null || this.ymin > vmin) this.ymin = vmin;
                if(this.ymax === null || this.ymax < vmax) this.ymax = vmax;
            });
        }

        findMinMax(this.cutters.county);
        findMinMax(this.cutters.states.avg, this.cutters.states.sdev);
        findMinMax(this.cutters.us.avg, this.cutters.us.sdev);

        if(this.ymin == null) return;
        if(this.ymax == null) return;

        //add a bit of space top/bottom
        const r = this.ymax - this.ymin;
        this.ymax += r/5;
        this.ymin -= r/5;
    }

    lineCommand = (point: number, i: number) => `L ${this.itox(i)} ${this.ptoy(point)}`

    ptoy(p: number) {
        if(this.ymin == null) return;
        if(this.ymax == null) return;

        const per = (p - this.ymin)/(this.ymax - this.ymin);
        return (this.height-30) - (this.height - 40)*per;
    }

    itox(y: number) {
        return ((1000-200)/(this.years.length-1))*y+150;
    }

    t2x(date: string) {
        const d = new Date(date);
        const begin = new Date("2012-01-01").getTime();
        const end = new Date("2020-01-01").getTime();
        const duration = end - begin;
        const x = ((1000-150)/duration)*(d.getTime()-begin)+100;
        return x;
    }

    a2h(amount: number) {
        return amount/100000+1;
    }

    sdevPath(points: number[], sdev: number[], command: any) {
        let d = "";

        //top
        for(let i = 0;i < points.length; ++i) {
            if(i == 0) d += 'M '+this.itox(i)+','+this.ptoy(points[i]+sdev[i]);
            else d+= command(points[i]+sdev[i], i);
        } 
        //bottom
        for(let i = points.length-1;i >= 0; --i) {
            d+= command(points[i]-sdev[i], i);
        } 
        return d;
    }

    svgPath(points: number[], command: any) {
        const d = points.reduce((acc: string, point: number, i: number)=>{
            if(i === 0) return `M ${this.itox(i)},${this.ptoy(point)}`
            else return `${acc} ${command(point, i)}`
        }, '')
        return d;
    }

    get yticks() {
        if(this.ymin == null) return [];
        if(this.ymax == null) return [];

        const ticks: number[] = [];

        //compute optimal min/max step
        const range = this.ymax - this.ymin;

        const step = range/4;
        if(range < 0.025) this.fixed = 2;

        const min = Math.round(this.ymin/step)*step;
        const max = this.ymax;
        for(let p = min;p <= max;p+=step) {
            const y = this.ptoy(p);
            if(y !== undefined && y > this.height-30) continue;
            ticks.push(p);
        }
        return ticks;
    }
}
</script>

<style scoped lang="scss">
svg {
    /* background-color: #f0f0f0; */
}
.legend,
.ticks {
    color: gray;
    font-size: 25px;
    text-align: right;
}
.with-tooltip .tooltip {
fill: #666;
font-size: 25px;
text-align: center;
opacity: 1;
}
/*
.with-tooltip:hover .tooltip {
opacity: 1;
}
*/
/*
.with-tooltip:hover circle {
stroke-width:6px;
}
*/
</style>
