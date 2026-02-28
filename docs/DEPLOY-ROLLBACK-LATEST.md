# Rollback Plan (auto) — Summa Social

Generat: 2026-02-28 09:24
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 1f17b85
SHA main a publicar: 39176a1

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 39176a1 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 1f17b85
git push origin prod --force-with-lease
```
