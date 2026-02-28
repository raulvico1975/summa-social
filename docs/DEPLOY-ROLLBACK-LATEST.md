# Rollback Plan (auto) — Summa Social

Generat: 2026-02-28 19:03
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 885ab58
SHA main a publicar: 0334390

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 0334390 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 885ab58
git push origin prod --force-with-lease
```
