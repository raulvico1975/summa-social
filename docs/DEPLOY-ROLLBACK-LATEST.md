# Rollback Plan (auto) — Summa Social

Generat: 2026-02-15 17:16
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 251bf16
SHA main a publicar: 16ba555

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 16ba555 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 251bf16
git push origin prod --force-with-lease
```
