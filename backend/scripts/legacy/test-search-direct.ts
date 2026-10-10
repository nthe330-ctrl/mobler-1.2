import { progressiveSpecialtySearch } from './server/progressiveSearch';
const req = { body: { specialModel: 'Board Game Café', lat: 25.0330, lng: 121.5654 } };
const res = { 
  status: (c) => ({ json: (d) => console.log("Status", c, d) }),
  json: (d) => console.log("Success", JSON.stringify(d, null, 2))
};
progressiveSpecialtySearch(req, res);
