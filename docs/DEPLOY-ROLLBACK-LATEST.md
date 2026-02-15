# Rollback Plan (auto) — Summa Social

Generat: 2026-02-15 18:45
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 7b4bed7
SHA main a publicar: a37080f

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert a37080f --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 7b4bed7
git push origin prod --force-with-lease
```
