# Rollback Plan (auto) — Summa Social

Generat: 2026-02-15 18:36
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: b0b3fbe
SHA main a publicar: 76007f5

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 76007f5 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard b0b3fbe
git push origin prod --force-with-lease
```
