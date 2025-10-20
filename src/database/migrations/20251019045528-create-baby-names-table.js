"use strict";

const { DataTypes } = require("sequelize");

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
