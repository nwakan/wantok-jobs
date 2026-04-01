/**
 * Migration: Jean AI Chat History Persistence
 * Creates tables for storing chat sessions and messages
 * 
 * Author: Agent Zero (Top-notch Developer Mode)
 * Date: 2026-03-22
 */

exports.up = async function(knex) {
  // Create chat_sessions table
  await knex.schema.createTable('chat_sessions', (table) => {
    table.increments('id').primary();
    table.string('session_id').notNullable().unique();
    table.integer('user_id').unsigned().nullable();
    table.string('platform').notNullable().defaultTo('web'); // 'web', 'whatsapp', 'api'
    table.string('phone_number').nullable(); // For WhatsApp sessions
    table.json('metadata').nullable(); // Additional session data
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('last_activity_at').defaultTo(knex.fn.now());
    table.boolean('is_active').defaultTo(true);

    table.index('session_id');
    table.index('user_id');
    table.index('phone_number');
    table.index(['platform', 'is_active']);
    table.index('created_at');

    table.foreign('user_id').references('users.id').onDelete('SET NULL');
  });

  // Create chat_messages table
  await knex.schema.createTable('chat_messages', (table) => {
    table.increments('id').primary();
    table.integer('session_id').unsigned().notNullable();
    table.enum('role', ['user', 'assistant', 'system']).notNullable();
    table.text('content').notNullable();
    table.string('intent').nullable(); // Detected intent
    table.float('confidence').nullable(); // Intent confidence score
    table.json('metadata').nullable(); // Additional message data (attachments, etc.)
    table.integer('tokens_used').unsigned().nullable(); // For cost tracking
    table.string('model').nullable(); // Which LLM was used
    table.integer('response_time_ms').unsigned().nullable(); // Performance tracking
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('session_id');
    table.index(['session_id', 'created_at']);
    table.index('role');
    table.index('intent');
    table.index('created_at');

    table.foreign('session_id').references('chat_sessions.id').onDelete('CASCADE');
  });

  console.log('✓ Chat persistence tables created successfully');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('chat_messages');
  await knex.schema.dropTableIfExists('chat_sessions');

  console.log('✓ Chat persistence tables dropped');
};
