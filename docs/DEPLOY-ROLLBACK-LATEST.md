# Rollback Plan (auto) — Summa Social

Generat: 2026-03-02 10:06
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: 879d117
SHA main a publicar: 5a7597a

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 5a7597a --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 879d117
git push origin prod --force-with-lease
```
