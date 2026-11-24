import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'game_moves'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('game_session_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('game_sessions')
        .onDelete('CASCADE')

      table.integer('step_order').unsigned().notNullable()
      table.integer('cell_index').unsigned().notNullable()
      table.boolean('is_valid').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()

      table.index(['game_session_id', 'step_order'], 'idx_game_moves_session_step')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
