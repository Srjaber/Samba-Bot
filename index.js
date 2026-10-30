,const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder, 
    ChannelType, 
    PermissionFlagsBits 
} = require('discord.js');

// 1. أمر إرسال لوحة التذاكر (Panel)
async function sendTicketPanel(message) {
    // التحقق من صلاحيات المشرف لإرسال البنل
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('عذراً، هذا الأمر مخصص للإداريين فقط.');
    }

    const panelEmbed = new EmbedBuilder()
        .setTitle('🎫 Samba Roleplay | نظام التذاكر الرسمي')
        .setDescription('**أهلاً بك عزيزي اللاعب في مركز دعم سيرفر سامبا رول بلاي.\nيرجى اختيار القسم المناسب لفتح تذكرة جديدة وسيتم الرد عليك في أقرب وقت ممكن.**\n\n> ⚠️ **يرجى عدم فتح تذكرة بدون سبب حقيقي لعدم تعرضك للعقوبة.**')
        .setColor('#FF0055') // أحمر لامع فخم
        .setFooter({ text: 'Samba Roleplay - جميع الحقوق محفوظة © 2026' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_player')
            .setLabel('ضد لاعب')
            .setStyle(ButtonStyle.Success), // أخضر

        new ButtonBuilder()
            .setCustomId('ticket_admin')
            .setLabel('ضد إداري')
            .setStyle(ButtonStyle.Danger), // أحمر لامع

        new ButtonBuilder()
            .setCustomId('ticket_support')
            .setLabel('الدعم الفني')
            .setStyle(ButtonStyle.Secondary) // رصاصي لامع
    );

    await message.channel.send({ embeds: [panelEmbed], components: [row] });
}

// 2. معالج الأزرار وإنشاء التذاكر وتطبيق الرولات وسجلات الحماية
async function handleTicketInteraction(interaction) {
    if (!interaction.isButton()) return;

    const { guild, user, customId } = interaction;
    let ticketType = '';
    let categoryName = '';
    let rolesToAdd = [];

    // تحديد الفئات والرولات المطلوبة لكل زر حسب طلبك
    if (customId === 'ticket_player') {
        ticketType = 'ضد لاعب';
        categoryName = '〔 🎫 〕تذاكر ضد لاعب';
        rolesToAdd = [
            '1556699588596080661',
            '1556707865383800922',
            '1557385495330431099'
        ];
    } else if (customId === 'ticket_admin') {
        ticketType = 'ضد إداري';
        categoryName = '〔 🎫 〕تذاكر ضد إداري';
        rolesToAdd = [
            '1557385495330431099',
            '1556707001122299964',
            '1564714796681527448',
            '1556706809971212418'
        ];
    } else if (customId === 'ticket_support') {
        ticketType = 'الدعم الفني';
        categoryName = '〔 🎫 〕تذاكر الدعم الفني';
        rolesToAdd = [
            '1565788349187362837',
            '1564714796681527448',
            '1556706809971212418'
        ];
    } else {
        return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        // [سجلات الحماية]: منع فتح أكثر من تذكرة لنفس الشخص بنفس القسم لمنع السبام
        const existingChannel = guild.channels.cache.find(
            c => c.name === `ticket-${user.username.toLowerCase()}`
        );
        if (existingChannel) {
            return interaction.editReply({ content: '❌ لديك تذكرة مفتوحة بالفعل، يرجى إغلاقها أولاً!' });
        }

        // إنشاء أو العثور على الكاتجوري (قسم التذاكر)
        let category = guild.channels.cache.find(c => c.name === categoryName && c.type === ChannelType.GuildCategory);
        if (!category) {
            category = await guild.channels.create({
                name: categoryName,
                type: ChannelType.GuildCategory,
            });
        }

        // إنشاء روم التذكرة مع صلاحيات الخصوصية الحماية
        const ticketChannel = await guild.channels.create({
            name: `ticket-${user.username}`,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
                {
                    id: guild.id, // منع الجميع من الرؤية
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: user.id, // السماح لصاحب التذكرة بالرؤية والكتابة
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                },
                {
                    id: guild.members.me.id, // السماح للبوت
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
                },
                // إعطاء صلاحيات لرولات الإدارة والدعم المحددة تلقائياً
                ...rolesToAdd.map(roleId => ({
                    id: roleId,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                }))
            ],
        });

        // رسالة ترحيب داخل التذكرة مع منشن الشخص الذي قام بفتح التذكرة
        const welcomeEmbed = new EmbedBuilder()
            .setTitle(`تذكرة جديدة: ${ticketType}`)
            .setDescription(`مرحباً بك ${user} تم فتح التذكرة بنجاح.\nيرجى كتابة مشكلتك أو تفاصيل الشكوى بانتظار استجابة الفريق المختص.`)
            .setColor('#FF0055')
            .setTimestamp();

        await ticketChannel.send({
            content: `${user} | ${rolesToAdd.map(r => `<@&${r}>`).join(' ')}`, // منشن الشخص + الرولات المطلوبة
            embeds: [welcomeEmbed]
        });

        // [سجلات الحماية]: تسجيل الحدث في روم اللوجز (إذا رغبت بإضافة قناة سجلات)
        const logChannelId = 'ضع_أيدي_قناة_السجلات_هنا'; // ضع آيدي قناة اللوجز الخاصة بك إن وجدت
        const logChannel = guild.channels.cache.get(logChannelId);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('🛡️ سجل الحماية: فتح تذكرة جديدة')
                .addFields(
                    { name: 'العضو', value: `${user.tag} (${user.id})`, inline: true },
                    { name: 'نوع التذكرة', value: ticketType, inline: true },
                    { name: 'الروم', value: `${ticketChannel}`, inline: true }
                )
                .setColor('#00FF00')
                .setTimestamp();
            logChannel.send({ embeds: [logEmbed] });
        }

        await interaction.editReply({ content: `✅ تم إنشاء تذكرتك بنجاح: ${ticketChannel}` });

    }
    catch (error) {
        console.error(error);
        await interaction.editReply({ content: '❌ حدث خطأ أثناء إنشاء التذكرة، يرجى إبلاغ الإدارة.' });
    }
}

