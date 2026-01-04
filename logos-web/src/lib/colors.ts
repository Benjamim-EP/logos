// Gera uma cor HSL consistente baseada em uma string (FileHash)
export function stringToColor(str: string, opacity = 1) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // H: 0-360 (Matiz)
  const h = Math.abs(hash % 360);
  // S: 60-80% (Saturação consistente para não ficar cinza)
  const s = 70; 
  // L: 50-70% (Luminosidade para ser visível no fundo preto)
  const l = 60;

  return `hsla(${h}, ${s}%, ${l}%, ${opacity})`;
}