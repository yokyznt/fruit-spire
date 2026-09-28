# Pruebas automáticas

Se corren con Node (sin navegador ni dependencias):

```
node tests/run-all.js        # todas las pruebas
node tests/balance.js . madura 60   # informe de balance (solo informa)
```

- **map.test.js**: genera miles de mapas de todos los tamaños/formas y verifica que nunca haya callejones sin salida.
- **minigames.test.js**: manos de póker, movimientos y rival del ajedrez chiquito de 5 columnas.
- **combat.test.js**: valida temas y castillos y simula combates contra todos los enemigos (con reglas de piso).
- **items.test.js**: prueba cada objeto y semilla en combates simulados.
- **seeds.test.js**: comportamiento de las semillas únicas.
