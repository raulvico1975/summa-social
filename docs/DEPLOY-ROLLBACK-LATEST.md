# Rollback Plan (auto) — Summa Social

Generat: 2026-02-15 10:58
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 1205c8f
SHA main a publicar: 00d3e79

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 00d3e79 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 1205c8f
git push origin prod --force-with-lease
```
