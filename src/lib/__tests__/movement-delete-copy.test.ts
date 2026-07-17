import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ca } from '../../i18n/ca';
import { es } from '../../i18n/es';
import { fr } from '../../i18n/fr';

describe('movement delete confirmation copy', () => {
  it('describes the movement deletion in every supported TS locale', () => {
    assert.deepStrictEqual(
      {
        title: ca.movements.table.confirmDeleteTransactionTitle,
        description: ca.movements.table.confirmDeleteTransactionDescription,
      },
      {
        title: 'Eliminar moviment',
        description: "Aquest moviment s'eliminarà permanentment. Aquesta acció no es pot desfer.",
      }
    );
    assert.deepStrictEqual(
      {
        title: es.movements.table.confirmDeleteTransactionTitle,
        description: es.movements.table.confirmDeleteTransactionDescription,
      },
      {
        title: 'Eliminar movimiento',
        description: 'Este movimiento se eliminará permanentemente. Esta acción no se puede deshacer.',
      }
    );
    assert.deepStrictEqual(
      {
        title: fr.movements.table.confirmDeleteTransactionTitle,
        description: fr.movements.table.confirmDeleteTransactionDescription,
      },
      {
        title: 'Supprimer le mouvement',
        description: 'Ce mouvement sera supprimé définitivement. Cette action est irréversible.',
      }
    );
  });
});
