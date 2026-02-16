# Rollback Plan (auto) — Summa Social

Generat: 2026-02-16 11:01
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: a4956e9
SHA main a publicar: 90df91f

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 90df91f --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard a4956e9
git push origin prod --force-with-lease
```
