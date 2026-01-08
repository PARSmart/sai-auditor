const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const EMPLEADOS_FILE = 'BASE EMPLEADOS A JULIO 2025.csv';
const INVENTARIO_FILE = 'UNIDAD OPERATIVA JALISCO.csv';
const OUTPUT_FILE = 'database/seed.sql';

function cleanString(str) {
    if (!str) return '';
    return str.trim().replace(/'/g, "''"); // Escape single quotes
}

function generateSql() {
    let sql = '-- Seed Data Generated automatically\n\n';

    // 1. Process Empleados
    console.log('Processing Empleados...');
    try {
        const content = fs.readFileSync(EMPLEADOS_FILE, 'utf-8');

        sql += 'INSERT INTO empleados (expediente, area_nombre, nombre_completo, descripcion_puesto, tipo_plaza, activo) VALUES\n';

        const records = [];
        const parser = parse(content, {
            relax_column_count: true,
            skip_empty_lines: true,
            trim: true
        });

        for (const record of parser) {
            let expediente = parseInt(record[1]);
            if (!isNaN(expediente) && record[0] && record[2]) {
                const area = cleanString(record[0]);
                const nombre = cleanString(record[2]);
                const puesto = cleanString(record[3] || '');
                const plaza = cleanString(record[4] || '');

                records.push(`(${expediente}, '${area}', '${nombre}', '${puesto}', '${plaza}', true)`);
            }
        }

        if (records.length > 0) {
            sql += records.join(',\n') + ';\n\n';
            console.log(`Generated ${records.length} empleados.`);
        } else {
            console.warn('No empleados found! Checking logic...');
        }

    } catch (e) {
        console.error('Error processing empleados:', e);
    }

    // 2. Process Inventario
    console.log('Processing Inventario...');
    try {
        const content = fs.readFileSync(INVENTARIO_FILE, 'utf-8');

        sql += 'INSERT INTO inventario_maestro (unidad_operativa, proveedor, serial, marca, modelo, tipo_equipo) VALUES\n';

        const records = [];
        const parser = parse(content, {
            relax_column_count: true,
            skip_empty_lines: true,
            trim: true
        });

        for (const record of parser) {
            if (record[0] === 'UNIDAD OPERATIVA' || record.length < 5) continue;

            const unidad = cleanString(record[0]);
            const proveedor = cleanString(record[1]);
            const serial = cleanString(record[2]).toUpperCase();
            const marca = cleanString(record[3]);
            const modelo = cleanString(record[4]);
            const tipo = cleanString(record[5]);

            if (serial && serial.length > 3 && serial !== 'SERIAL' && serial !== 'SERIE') {
                records.push(`('${unidad}', '${proveedor}', '${serial}', '${marca}', '${modelo}', '${tipo}')`);
            }
        }

        if (records.length > 0) {
            sql = sql.replace('VALUES', '') + 'VALUES\n' + records.join(',\n') + '\nON CONFLICT (serial) DO NOTHING;\n';
            console.log(`Generated ${records.length} inventario items.`);
        }

    } catch (e) {
        console.error('Error processing inventario:', e);
    }

    // Ensure directory exists
    if (!fs.existsSync('database')) {
        fs.mkdirSync('database');
    }

    fs.writeFileSync(OUTPUT_FILE, sql);
    console.log(`Done. SQL written to ${OUTPUT_FILE}`);
}

generateSql();
