# Rollback Plan (auto) — Summa Social

Generat: 2026-02-25 08:49
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: a226316
SHA main a publicar: aa4332a

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert aa4332a --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard a226316
git push origin prod --force-with-lease
```
