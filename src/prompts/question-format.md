## Reglas de formato para el LaTeX

- Devuelve SOLO el LaTeX de la pregunta, sin preámbulo, sin título, sin encabezados, sin separadores tipo `---`, sin `\begin{document}`.
- No añadas ningún texto antes ni después del LaTeX de la pregunta.
- Usa `\[ ... \]` para ecuaciones en bloque y `\( ... \)` para ecuaciones en línea.
- Paquetes siempre disponibles (no los cargues tú): `amsmath`, `amssymb`, `xcolor`.
- Paquetes disponibles bajo demanda (se cargan automáticamente si los usas, no los declares): `tikz` (con librerías `arrows.meta`, `calc`, `patterns`, `decorations.pathreplacing`, `angles`, `quotes`), `pgfplots` (compat 1.18), `caption`, `enumitem` (úsalo si necesitas opciones tipo `\begin{enumerate}[label=(a)]` para apartados).
- Si una figura ayuda (geometría, grafos, ejes, diagramas), úsala con `tikzpicture` o `pgfplots` dentro de un entorno `figure[h]` con `\centering`. No uses `\includegraphics` ni imágenes externas.
- No uses otros paquetes ni comandos no estándar.

### Reglas para figuras TikZ

- Mantén la figura simple. Si dudas de un comando, no lo uses: prefiere primitivas básicas (`\draw`, `\node`, `\coordinate`, `\fill`).
- En `\foreach`, todos los elementos de la lista deben usar el mismo separador. Si declaras `\foreach \p/\pos in {...}`, todos los items deben ser de la forma `algo/algo`, sin mezclar con `=`. Ejemplo correcto: `\foreach \p/\pos in {A/below left, B/below, C/above right}`.
- Para etiquetar nodos en posiciones distintas es más legible escribir un `\node` por etiqueta sin usar `\foreach`, sobre todo si las posiciones varían.
- Posiciones válidas para `\node`: `above`, `below`, `left`, `right`, `above left`, `above right`, `below left`, `below right`. No inventes otras.
- Verifica que cada coordenada o nodo que referencias ha sido definido antes con `\coordinate` o como nombre de `\node`.
- Para hexágonos regulares, círculos inscritos y figuras periódicas, usa fórmulas trigonométricas explícitas (`cos(60*\i)`) en vez de listas hardcoded propensas a errores.
- Si necesitas ejes cartesianos con función, prefiere `\begin{axis}` de `pgfplots` antes que dibujar a mano con TikZ.
- Cierra siempre `\end{tikzpicture}` (y `\end{axis}` si lo usas) y termina las sentencias con `;`.
- No numeres la pregunta.
- Si la pregunta tiene apartados, usa (a), (b), (c), etc.
- Escribe el enunciado en español.
- NO incluyas la solución.
