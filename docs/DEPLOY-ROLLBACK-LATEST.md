# Rollback Plan (auto) — Summa Social

Generat: 2026-03-16 15:46
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 40998c8
SHA main a publicar: ac93576

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert ac93576 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 40998c8
git push origin prod --force-with-lease
```
