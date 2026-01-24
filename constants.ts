export const INITIAL_CODE = `// KLang Roughness Example
// Demonstrating control of material roughness

// Material with high roughness (matte, like concrete)
mat_concrete = material { 
  color = red 
  roughness = 1.0 
}

// Material with low roughness (shiny, like plastic/metal)
mat_shiny = material { 
  color = blue 
  roughness = 0.0 
}

// Left Block: Concrete (Rough)
block_rough = mesh {
  vertices = [
    -3, 0, 1; -1, 0, 1; -1, 2, 1; -3, 2, 1; // Front face loop
    -3, 0, -1; -1, 0, -1; -1, 2, -1; -3, 2, -1; // Back face loop
  ]

  faces = [
    0, 1, 2, 3 : mat_concrete; // Front
    4, 5, 6, 7 : mat_concrete; // Back
    0, 1, 5, 4 : mat_concrete; // Bottom
    1, 2, 6, 5 : mat_concrete; // Right
    2, 3, 7, 6 : mat_concrete; // Top
    3, 0, 4, 7 : mat_concrete; // Left
  ]
}

// Right Block: Shiny
block_shiny = mesh {
  vertices = [
    1, 0, 1; 3, 0, 1; 3, 2, 1; 1, 2, 1; // Front face loop
    1, 0, -1; 3, 0, -1; 3, 2, -1; 1, 2, -1; // Back face loop
  ]

  faces = [
    0, 1, 2, 3 : mat_shiny;
    4, 5, 6, 7 : mat_shiny;
    0, 1, 5, 4 : mat_shiny;
    1, 2, 6, 5 : mat_shiny;
    2, 3, 7, 6 : mat_shiny;
    3, 0, 4, 7 : mat_shiny;
  ]
}

console.print("Roughness demonstration loaded.")`;