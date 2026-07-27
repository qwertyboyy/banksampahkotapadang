import * as AdminNasabahAccountModel from "../models/adminNasabahAccountModel.js";

export const getNasabahAccounts = async (req, res) => {
  try {
    const { id_bank_sampah } = req.user;

    const data =
      await AdminNasabahAccountModel.getNasabahAccounts(id_bank_sampah);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil akun nasabah",
    });
  }
};

export const getPendingNasabahAccounts = async (req, res) => {
  try {
    const { id_bank_sampah } = req.user;

    const data = await AdminNasabahAccountModel.getPendingNasabahAccounts(
      id_bank_sampah,
    );

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil akun nasabah pending",
    });
  }
};

export const approveNasabahAccount = async (req, res) => {
  try {
    const { id_bank_sampah } = req.user;
    const { id_user } = req.params;

    const account = await AdminNasabahAccountModel.getNasabahAccountByBank(
      id_user,
      id_bank_sampah,
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Akun nasabah tidak ditemukan pada bank sampah ini",
      });
    }

    await AdminNasabahAccountModel.approveNasabahAccount(
      id_user,
      id_bank_sampah,
    );

    res.json({
      success: true,
      message: "Akun nasabah berhasil diaktifkan",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Gagal mengaktifkan akun nasabah",
    });
  }
};

export const rejectNasabahAccount = async (req, res) => {
  try {
    const { id_bank_sampah } = req.user;
    const { id_user } = req.params;

    const account = await AdminNasabahAccountModel.getNasabahAccountByBank(
      id_user,
      id_bank_sampah,
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Akun nasabah tidak ditemukan pada bank sampah ini",
      });
    }

    await AdminNasabahAccountModel.rejectNasabahAccount(
      id_user,
      id_bank_sampah,
    );

    res.json({
      success: true,
      message: "Akun nasabah berhasil ditolak",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Gagal menolak akun nasabah",
    });
  }
};

export const resetNasabahPassword = async (req, res) => {
  try {
    const { id_bank_sampah } = req.user;
    const { id_user } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password baru minimal 6 karakter",
      });
    }

    const account = await AdminNasabahAccountModel.getNasabahAccountByBank(
      id_user,
      id_bank_sampah,
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Akun nasabah tidak ditemukan pada bank sampah ini",
      });
    }

    await AdminNasabahAccountModel.resetNasabahPassword(
      id_user,
      id_bank_sampah,
      password,
    );

    res.json({
      success: true,
      message: "Password akun nasabah berhasil direset",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Gagal reset password akun nasabah",
    });
  }
};
