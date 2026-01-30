import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

interface Props {
  data: Record<string, any>;
  theme: 'dark' | 'light';
  gridSize: number;
  viewDistance: number;
}

// Generate a procedural noise texture for the "rocky" look
const createNoiseTexture = () => {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, size, size);
      
      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;
      
      // Simple Perlin-ish noise approximation or just white noise
      for (let i = 0; i < data.length; i += 4) {
          const val = Math.random() * 255;
          data[i] = val;
          data[i+1] = val;
          data[i+2] = val;
          data[i+3] = 255;
      }
      ctx.putImageData(imageData, 0, 0);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  return texture;
};

export const Renderer: React.FC<Props> = ({ data, theme, gridSize, viewDistance }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const noiseTex = useRef<THREE.Texture | null>(null);

  useEffect(() => {
    if (!noiseTex.current) {
       noiseTex.current = createNoiseTexture();
    }
  }, []);

  // Initialize Scene
  useEffect(() => {
    if (!mountRef.current) return;

    // --- Setup Three.js ---
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, viewDistance);
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    
    mountRef.current.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Grid
    const gridHelper = new THREE.GridHelper(gridSize, gridSize, 0x444444, 0x222222);
    scene.add(gridHelper);
    gridRef.current = gridHelper;

    const axesHelper = new THREE.AxesHelper(2);
    scene.add(axesHelper);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.bias = -0.0005; 
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
       if (!mountRef.current) return;
       const w = mountRef.current.clientWidth;
       const h = mountRef.current.clientHeight;
       if (w === 0 || h === 0) return;

       camera.aspect = w / h;
       camera.updateProjectionMatrix();
       renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(mountRef.current);
    
    handleResize();

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(frameId);
      pmremGenerator.dispose();
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []); // Only run once on mount

  // Update Environment Settings
  useEffect(() => {
      if (!sceneRef.current || !cameraRef.current) return;

      const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
      sceneRef.current.background = new THREE.Color(bgColor);
      sceneRef.current.fog = new THREE.Fog(bgColor, 10, viewDistance);
      cameraRef.current.far = viewDistance;
      cameraRef.current.updateProjectionMatrix();

      // Update Grid
      if (gridRef.current) {
          sceneRef.current.remove(gridRef.current);
          // Keep grid color constant (Dark Mode style) regardless of theme
          const gridColor1 = 0x444444; 
          const gridColor2 = 0x222222;
          const newGrid = new THREE.GridHelper(gridSize, gridSize, gridColor1, gridColor2);
          sceneRef.current.add(newGrid);
          gridRef.current = newGrid;
      }
  }, [theme, gridSize, viewDistance]);

  // Update Scene Data
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // --- Helpers ---
    const createThreeMaterial = (matData: any, defaultColor = 0xcccccc) => {
      let color = defaultColor;
      let roughness = 0.5;
      
      if (matData) {
         if (matData.color !== undefined) color = matData.color;
         if (matData.roughness !== undefined) roughness = matData.roughness;
         
         if (!matData.color && (matData.texture === "brick.png" || matData.ref === "bricks")) color = 0xaa4444;
         if (!matData.color && matData.item === "roof_tiles") color = 0x884444;
      }

      const mat = new THREE.MeshStandardMaterial({ 
        color, 
        roughness,
        metalness: 0.1,
        side: THREE.DoubleSide
      });

      if (roughness > 0 && noiseTex.current) {
          mat.bumpMap = noiseTex.current;
          mat.bumpScale = roughness * 0.15; 
      }

      return mat;
    };

    const createMeshResources = (obj: any) => {
       if (obj.shape === 'pyramid') {
          const height = obj.height || 1.5;
          const geom = new THREE.ConeGeometry(1, height, 4);
          
          if (obj.direction === 'down') geom.rotateX(Math.PI);
          else if (obj.direction === 'x') geom.rotateZ(-Math.PI/2);
          else if (obj.direction === 'z') geom.rotateX(Math.PI/2);

          const mat = createThreeMaterial(obj.material || obj.props);
          return { geometry: geom, materials: [mat] };
       }

       if (obj.shape === 'mesh') {
          const uniqueMaterials: any[] = [];
          const materialMap = new Map<string, number>();
          
          const getMatIndex = (mat: any) => {
             const key = JSON.stringify(mat || {});
             if (materialMap.has(key)) return materialMap.get(key)!;
             
             const idx = uniqueMaterials.length;
             uniqueMaterials.push(mat);
             materialMap.set(key, idx);
             return idx;
          };

          const baseMatIndex = getMatIndex(obj.material || {});
          const trianglesByMaterial: Record<number, number[]> = {};

          obj.faces.forEach((face: any) => {
             const matIdx = face.material ? getMatIndex(face.material) : baseMatIndex;
             if (!trianglesByMaterial[matIdx]) trianglesByMaterial[matIdx] = [];
             
             const polyIndices = face.indices;
             for (let i = 1; i < polyIndices.length - 1; i++) {
                trianglesByMaterial[matIdx].push(polyIndices[0], polyIndices[i], polyIndices[i+1]);
             }
          });

          const finalPositions: number[] = [];
          const finalUVs: number[] = [];
          const geometry = new THREE.BufferGeometry();
          
          let indexOffset = 0;
          const sortedMatIndices = Object.keys(trianglesByMaterial).map(Number).sort((a,b) => a-b);
          
          sortedMatIndices.forEach(matIdx => {
             const indices = trianglesByMaterial[matIdx];
             const start = indexOffset / 3;
             
             for (let i = 0; i < indices.length; i += 3) {
                const i0 = indices[i];
                const i1 = indices[i+1];
                const i2 = indices[i+2];

                const v0 = obj.vertices[i0] || {x:0,y:0,z:0};
                const v1 = obj.vertices[i1] || {x:0,y:0,z:0};
                const v2 = obj.vertices[i2] || {x:0,y:0,z:0};

                const p0 = new THREE.Vector3(v0.x, v0.y, v0.z);
                const p1 = new THREE.Vector3(v1.x, v1.y, v1.z);
                const p2 = new THREE.Vector3(v2.x, v2.y, v2.z);

                const cb = new THREE.Vector3().subVectors(p2, p1);
                const ab = new THREE.Vector3().subVectors(p0, p1);
                const normal = new THREE.Vector3().crossVectors(cb, ab).normalize();

                const generateUV = (p: THREE.Vector3, n: THREE.Vector3) => {
                   const nx = Math.abs(n.x);
                   const ny = Math.abs(n.y);
                   const nz = Math.abs(n.z);

                   if (nx > ny && nx > nz) return { x: p.z, y: p.y }; 
                   if (ny > nx && ny > nz) return { x: p.x, y: p.z }; 
                   return { x: p.x, y: p.y };                         
                };

                const uv0 = generateUV(p0, normal);
                const uv1 = generateUV(p1, normal);
                const uv2 = generateUV(p2, normal);

                finalPositions.push(p0.x, p0.y, p0.z);
                finalPositions.push(p1.x, p1.y, p1.z);
                finalPositions.push(p2.x, p2.y, p2.z);

                finalUVs.push(uv0.x, uv0.y);
                finalUVs.push(uv1.x, uv1.y);
                finalUVs.push(uv2.x, uv2.y);
             }
             
             const count = indices.length;
             geometry.addGroup(start, count, matIdx);
             indexOffset += count;
          });

          geometry.setAttribute('position', new THREE.Float32BufferAttribute(finalPositions, 3));
          geometry.setAttribute('uv', new THREE.Float32BufferAttribute(finalUVs, 2));
          geometry.computeVertexNormals();

          const threeMaterials = uniqueMaterials.map(m => createThreeMaterial(m));

          return { geometry, materials: threeMaterials };
       }

       return { geometry: new THREE.BoxGeometry(1,1,1), materials: [createThreeMaterial(null)] };
    };

    // Remove old user objects (keep grid, lights)
    // We assume objects with user IDs are the ones to remove or update.
    // For simplicity in this playground, we clear non-helpers and rebuild.
    for( let i = scene.children.length - 1; i >= 0; i--) { 
        const obj = scene.children[i];
        if (obj.userData && obj.userData.id) {
            scene.remove(obj);
        }
    }

    const objectMap = new Map<string, THREE.Object3D>();

    // 1. Create all objects
    Object.keys(data).forEach(key => {
      const objData = data[key];
      let object3d: THREE.Object3D;

      if (objData.type === 'group') {
        object3d = new THREE.Group();
      } else {
        const { geometry, materials } = createMeshResources(objData);
        object3d = new THREE.Mesh(geometry, materials.length > 1 ? materials : materials[0]);
        object3d.castShadow = true;
        object3d.receiveShadow = true;
      }

      object3d.userData = { id: key };
      object3d.position.set(objData.pos.x, objData.pos.y, objData.pos.z);
      object3d.rotation.set(objData.rot.x, objData.rot.y, objData.rot.z);
      object3d.scale.set(objData.scale.x, objData.scale.y, objData.scale.z);

      objectMap.set(key, object3d);
    });

    // 2. Build hierarchy
    objectMap.forEach((obj3d, key) => {
      const objData = data[key];
      if (objData.parent && objectMap.has(objData.parent)) {
        const parent = objectMap.get(objData.parent);
        parent?.add(obj3d);
      } else {
        scene.add(obj3d);
      }
    });

  }, [data]);

  return <div ref={mountRef} className="w-full h-full overflow-hidden" />;
};