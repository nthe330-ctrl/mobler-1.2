import fs from 'fs';

let content = fs.readFileSync('src/services/search/LocalLanguageResolver.ts', 'utf8');

const oldTaiwanBounds = `// Taiwan bounds: lat ~ 21.8 - 25.4, lng ~ 119.9 - 122.1
      if (lat >= 21.8 && lat <= 25.5 && lng >= 119.8 && lng <= 122.2) {
        let city = 'Taipei';
        if (lat < 23.0) city = 'Kaohsiung';
        else if (lat < 23.8) city = 'Taichung';
        else if (lat < 24.5) city = 'Hsinchu';
        return {`;

const newTaiwanBounds = `// Taiwan bounds: lat ~ 21.8 - 25.4, lng ~ 119.9 - 122.1
      if (lat >= 21.8 && lat <= 25.5 && lng >= 119.8 && lng <= 122.2) {
        let city = 'Taipei';
        if (lat < 22.8) city = 'Kaohsiung';
        else if (lat < 23.2) city = 'Tainan';
        else if (lat < 23.6) city = 'Chiayi';
        else if (lat < 24.0) city = 'Changhua';
        else if (lat < 24.3) city = 'Taichung';
        else if (lat < 24.6) city = 'Miaoli';
        else if (lat < 24.9) city = 'Hsinchu';
        else if (lat < 25.0) city = 'Taoyuan';
        return {`;

content = content.replace(oldTaiwanBounds, newTaiwanBounds);

fs.writeFileSync('src/services/search/LocalLanguageResolver.ts', content);
