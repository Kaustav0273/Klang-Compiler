
let _seed = 12345;
const lcg = () => {
  _seed = (_seed * 1664525 + 1013904223) % 4294967296;
  return _seed / 4294967296;
};

export const stdLibs: Record<string, any> = {
  'klang-math': {
    abs: Math.abs,
    pow: Math.pow,
    sqrt: Math.sqrt,
    cbrt: Math.cbrt,
    
    round: Math.round,
    floor: Math.floor,
    ceil: Math.ceil,
    trunc: Math.trunc,
    
    min: Math.min,
    max: Math.max,
    clamp: (x: number, min: number, max: number) => Math.min(Math.max(x, min), max),
    
    random: (min?: number, max?: number) => {
        const r = Math.abs(lcg());
        if (min !== undefined && max !== undefined) {
            return Math.floor(r * (max - min + 1)) + min;
        }
        return r;
    },
    seed: (s: number) => { _seed = s; return s; },
    
    // Trig (default degrees)
    sin: (d: number) => Math.sin(d * Math.PI / 180),
    cos: (d: number) => Math.cos(d * Math.PI / 180),
    tan: (d: number) => Math.tan(d * Math.PI / 180),
    rad: (r: number) => r * (180 / Math.PI), 
    
    pi: Math.PI,
    e: Math.E,
    tau: Math.PI * 2,
    infinity: Infinity,
    
    lerp: (a: number, b: number, t: number) => a + (b - a) * t,
    map: (x: number, in_min: number, in_max: number, out_min: number, out_max: number) => {
      return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
    },
    distance: (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) => {
       return Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2) + Math.pow(z2-z1, 2));
    },
    normalize: (x: number, y: number, z: number) => {
       const len = Math.sqrt(x*x + y*y + z*z);
       if (len === 0) return {x:0, y:0, z:0};
       return {x: x/len, y: y/len, z: z/len};
    },
    
    percent: (p: number, total: number) => (p / 100) * total,
    ratio: (a: number, b: number, c: number) => (c * a) / b,
  },
  'klang-physics': {
    // --- Classical Mechanics ---
    force: (m: number, a: number) => m * a,
    acceleration: (f: number, m: number) => f / m,
    momentum: (m: number, v: number) => m * v,
    kinetic: (m: number, v: number) => 0.5 * m * v * v,
    potential: (m: number, h: number, g: number = 9.8) => m * g * h,
    work: (f: number, d: number) => f * d,
    power: (w: number, t: number) => w / t,
    pressure: (f: number, a: number) => f / a,
    density: (m: number, v: number) => m / v,
    velocity: (d: number, t: number) => d / t,
    accel: (v2: number, v1: number, t: number) => (v2 - v1) / t,

    g: 9.8,
    c: 299792458,
    R: 8.314,

    forceVector: (m: number, ax: number, ay: number, az: number) => ({
        x: m * ax,
        y: m * ay,
        z: m * az
    }),

    distanceTraveled: (v0: number, a: number, t: number) => v0 * t + 0.5 * a * t * t,
    finalVelocity: (v0: number, a: number, t: number) => v0 + a * t,
    
    elasticCollision: (m1: number, v1: number, m2: number, v2: number) => {
        const v1_final = ((m1 - m2) * v1 + 2 * m2 * v2) / (m1 + m2);
        const v2_final = ((2 * m1) * v1 + (m2 - m1) * v2) / (m1 + m2);
        return { v1: v1_final, v2: v2_final };
    },

    // --- Liquid Physics ---
    liquidDensity: 1000, // kg/m^3 (water)
    surfaceGamma: 0.0728, // N/m

    buoyantForce: (vol: number, density: number = 1000) => vol * density * 9.8,
    
    fluidPressure: (depth: number, density: number = 1000) => density * 9.8 * depth,
    
    dragForce: (density: number, velocity: number, area: number, dragCoeff: number) => {
        return 0.5 * density * velocity * velocity * dragCoeff * area;
    },
    
    displacement: (mass: number, density: number = 1000) => mass / density,
    
    surfaceTension: (len: number, gamma: number = 0.0728) => gamma * len,
    
    netForce: (mass: number, vol: number, drag: number = 0) => {
        // Buoyant (up) - Weight (down) - Drag
        // Assuming standard water density for buoyancy if not specified in prompt context, 
        // using 1000 as per "Defaults used where natural"
        const Fb = vol * 1000 * 9.8;
        const Fg = mass * 9.8;
        return Fb - Fg - drag;
    },
    
    flowSpeed: (volumeRate: number, area: number) => volumeRate / area,
    flowRate: (area: number, velocity: number) => area * velocity,

    // Vector Helpers
    buoyantForceVector: (vol: number, density: number, dir: {x:number, y:number, z:number}) => {
        const mag = vol * density * 9.8;
        const len = Math.sqrt(dir.x*dir.x + dir.y*dir.y + dir.z*dir.z);
        if (len === 0) return {x:0, y:0, z:0};
        return {
            x: mag * (dir.x / len),
            y: mag * (dir.y / len),
            z: mag * (dir.z / len)
        };
    },

    dragForceVector: (density: number, v: {x:number, y:number, z:number}, area: number, cd: number) => {
        const speed = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
        if (speed === 0) return {x:0, y:0, z:0};
        
        const fMag = 0.5 * density * speed * speed * cd * area;
        
        // Direction is opposite to velocity
        return {
            x: - (v.x / speed) * fMag,
            y: - (v.y / speed) * fMag,
            z: - (v.z / speed) * fMag
        };
    },

    // Helpers
    floatation: (mass: number, vol: number) => {
        // Returns true if object density < fluid density (1000)
        return (mass / vol) < 1000;
    },
    
    netVerticalForce: (mass: number, vol: number, drag: number = 0) => {
        // Alias/Identical to netForce but explicit in prompt
        const Fb = vol * 1000 * 9.8;
        const Fg = mass * 9.8;
        return Fb - Fg - drag;
    },
    
    flowVelocity: (area: number, volumeRate: number) => volumeRate / area,
  }
};
