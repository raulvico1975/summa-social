# Rollback Plan (auto) — Summa Social

Generat: 2026-02-17 09:25
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 78b7748
SHA main a publicar: d50bfd4

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert d50bfd4 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 78b7748
git push origin prod --force-with-lease
```
