#!/usr/bin/env node

const fs = require('fs');
const async = require('async');
const config = require('../../config');
const mssql = require('mssql');

console.log("statsamerica_resilience -----------------------------------");

//I can only connect from IU VPN connected IPs - not dev1
mssql.connect(config.stats_america.db_red_dr).then(async pool=>{
    console.log("loading dr_data / Resilience values for individual indices per county.");
    const dr_data = await pool.request().query(`
        SELECT * FROM dr_data
    `);
    dr_data.recordset.forEach(rec=>{
        rec.statefips = rec.statefips.trim();
        rec.countyfips = rec.countyfips.trim();
        rec.measure = rec.measure.trim();
        rec.measure_category = rec.measure_category.trim();
        rec.year = rec.year.trim();

        //if(rec.statefips == "18" && rec.countyfips == "105" && rec.measure == "16") console.dir(rec);
    });
    fs.writeFileSync(config.pubdir+"/raw/dr.json", JSON.stringify(dr_data.recordset));

    console.log("loading dr_data_norm / Resilience values for individual indices per county.");
    const dr_data_norm = await pool.request().query(`
        SELECT statefips, countyfips, measure, measure_category, year FROM dr_data_norm
    `);
    console.log("done loading from sql");
    dr_data_norm.recordset.forEach(rec=>{
        rec.statefips = rec.statefips.trim();
        rec.countyfips = rec.countyfips.trim();
        rec.measure = rec.measure.trim();
        rec.measure_category = rec.measure_category.trim();
        rec.year = rec.year.trim();
    });
    console.log("now saving to disk");
    fs.writeFileSync(config.pubdir+"/raw/dr_normalized.json", JSON.stringify(dr_data_norm.recordset));

    console.log("loading dr_measure");
    const dr_measure = await pool.request().query(`
        SELECT * FROM dr_measure
    `);
    fs.writeFileSync(config.pubdir+"/raw/dr_measure.json", JSON.stringify(dr_measure.recordset));

    console.log("loading dr_measure_category");
    const dr_measure_category = await pool.request().query(`
        SELECT * FROM dr_measure_category
    `);
    fs.writeFileSync(config.pubdir+"/raw/dr_measure_category.json", JSON.stringify(dr_measure_category.recordset));

    pool.close();
});

