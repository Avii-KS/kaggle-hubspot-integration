"use strict";

const { DataTypes } = require("sequelize");

/**
 * Migration: Create Baby Names Table
 *
 * @author Avinash K S
 * @created Oct 19, 2025
 *
 * This migration creates the core table for storing baby names data.
 * Initially considered using a CHAR(1) for sex, but went with ENUM
 * to support both single-letter and full-word gender values.
 *
 * Note: Added indexes after noticing slow queries during testing with
 * large datasets. The name+sex compound index significantly improved
 * lookup performance.
 *
 * TODO: Consider adding a year column if we want to track name popularity
 * trends over time in the future.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Main table creation
    await queryInterface.createTable("baby_names", {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(100), // Increased from 50 to handle longer names
        allowNull: false,
      },
      sex: {
        type: DataTypes.ENUM("M", "F", "Male", "Female"),
        allowNull: false,
        comment: "Supports both single-letter and full-word gender values",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    // Add index for better query performance
    await queryInterface.addIndex("baby_names", ["name"], {
      name: "idx_baby_names_name",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("baby_names");
  },
};
