# DEMO - Guia pas a pas

## 1. Què és la DEMO

La DEMO és una versió de Summa Social amb dades inventades per fer proves i presentacions.
No afecta les dades reals de cap entitat.

---

## 2. Abans de començar (només el primer cop)

Necessites donar permís al teu ordinador per crear dades de demo.

Obre el Terminal i executa:

```bash
gcloud auth application-default login
```

**Què passarà:**
- S'obrirà el navegador
- Fes login amb el teu compte de Google
- Quan acabis, torna al Terminal

Això només cal fer-ho **una vegada**. El permís queda guardat.

---

## 3. Llançar la DEMO

### DEMO curta (per presentacions ràpides)

```bash
npm run demo:up
```

### DEMO de treball (amb més dades)

```bash
npm run demo:up:work
```

**Què fa automàticament:**
- Tanca qualsevol servidor anterior
- Arrenca el servidor de demo
- Crea les dades de prova
- Obre el navegador a la pàgina de demo

---

## 4. On entrar

| URL | Què és |
|-----|--------|
| http://localhost:9002/demo | Pàgina principal de la demo |
| http://localhost:9002/demo/dashboard | Tauler de control |
| http://localhost:9002/demo/login | Entrada (si et demana) |

---

## 5. Si alguna cosa falla

| Problema | Solució |
|----------|---------|
| "Port 9002 ocupat" | La comanda ja ho resol sola. Si persisteix, tanca el Terminal i torna a obrir-lo. |
| "No tinc permisos" o "ADC" | Torna a executar: `gcloud auth application-default login` |
| "No surt la demo" | Tanca el Terminal, obre'n un de nou, i torna a executar `npm run demo:up` |

---

## 6. Regla mental

> **Un cop:** `gcloud auth application-default login`
>
> **Sempre:** `npm run demo:up`
