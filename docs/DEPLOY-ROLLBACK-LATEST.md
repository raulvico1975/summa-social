# Rollback Plan (auto) — Summa Social

Generat: 2026-06-02 14:41
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: b93337bb5
SHA branca a publicar (main): 04fc2b53a

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 04fc2b53a --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard b93337bb5
git push origin prod --force-with-lease
```
