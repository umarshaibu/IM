using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using IM.Core.Interfaces;

namespace IM.Infrastructure.Services;

public class EncryptionService : IEncryptionService
{
    private readonly byte[] _key;
    private readonly byte[] _iv;

    public EncryptionService(IConfiguration configuration)
    {
        // Get encryption key from configuration
        var encryptionKey = configuration["Encryption:Key"]
            ?? throw new InvalidOperationException("Encryption key not configured");

        var encryptionIV = configuration["Encryption:IV"]
            ?? throw new InvalidOperationException("Encryption IV not configured");

        _key = Convert.FromBase64String(encryptionKey);
        _iv = Convert.FromBase64String(encryptionIV);

        if (_key.Length != 32)
            throw new InvalidOperationException("Encryption key must be 256 bits (32 bytes)");

        if (_iv.Length != 16)
            throw new InvalidOperationException("Encryption IV must be 128 bits (16 bytes)");
    }

    public string Encrypt(string plainText)
    {
        if (string.IsNullOrEmpty(plainText))
            return plainText;

        using var aes = Aes.Create();
        aes.Key = _key;
        aes.IV = _iv;
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;

        using var encryptor = aes.CreateEncryptor();
        using var ms = new MemoryStream();
        using var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write);
        using var sw = new StreamWriter(cs);

        sw.Write(plainText);
        sw.Flush();
        cs.FlushFinalBlock();

        return Convert.ToBase64String(ms.ToArray());
    }

    public string Decrypt(string cipherText)
    {
        if (string.IsNullOrEmpty(cipherText))
            return cipherText;

        try
        {
            var cipherBytes = Convert.FromBase64String(cipherText);

            using var aes = Aes.Create();
            aes.Key = _key;
            aes.IV = _iv;
            aes.Mode = CipherMode.CBC;
            aes.Padding = PaddingMode.PKCS7;

            using var decryptor = aes.CreateDecryptor();
            using var ms = new MemoryStream(cipherBytes);
            using var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read);
            using var sr = new StreamReader(cs);

            return sr.ReadToEnd();
        }
        catch (Exception)
        {
            // If decryption fails, return original text (for backwards compatibility with unencrypted data)
            return cipherText;
        }
    }
}
