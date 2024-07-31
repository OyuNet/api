const k9crypt = require('k9crypt');

const secretKey = process.env.SECRET_KEY || "defaultSecretKey";
const encryptor = new k9crypt(secretKey);

/**
 * Encrypts the given data using the encryptor.
 *
 * @param {any} data - The data to be encrypted.
 * @return {Promise<any>} A promise that resolves to the encrypted data.
 */
exports.encrypt = async (data) => {
    return await encryptor.encrypt(data);
};

exports.decrypt = async (data) => {
    return await encryptor.decrypt(data);
};
