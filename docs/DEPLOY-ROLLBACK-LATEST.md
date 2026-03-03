# Rollback Plan (auto) — Summa Social

Generat: 2026-03-03 20:18
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 72e885d
SHA main a publicar: 840a1e9

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 840a1e9 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 72e885d
git push origin prod --force-with-lease
```
