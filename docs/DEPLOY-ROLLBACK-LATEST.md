# Rollback Plan (auto) — Summa Social

Generat: 2026-05-18 11:23
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 8a487981e
SHA branca a publicar (main): 70b8f1b7c

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 70b8f1b7c --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 8a487981e
git push origin prod --force-with-lease
```
