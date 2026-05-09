# Rollback Plan (auto) — Summa Social

Generat: 2026-05-09 10:12
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 83eb016ca
SHA branca a publicar (main): 92170e945

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 92170e945 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 83eb016ca
git push origin prod --force-with-lease
```
